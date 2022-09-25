import inquirer from "inquirer";
import Client, { AuthenticatedRole } from "vex-tm-client";
import OBSWebSocket from "obs-websocket-js";
import { Atem } from "atem-connection";

export async function getTournamentManagerCredentials(): Promise<{
  address: string;
  password: string;
}> {
  return inquirer.prompt([
    {
      type: "input",
      message: "VEX TM Address:",
      name: "address",
      default() {
        return "127.0.0.1";
      },
    },
    {
      type: "password",
      message: "VEX TM Password:",
      mask: "*",
      name: "password",
    },
  ]);
}

export async function getOBSCredentials(): Promise<{
  address: string;
  password: string;
} | null> {

  const { useOBS }: { useOBS: boolean } = await inquirer.prompt([{
    type: "confirm",
    name: "useOBS",
    message: "Would you like to control OBS?",
    default: true
  }]);

  if (!useOBS) {
    return null;
  }

  return inquirer.prompt([
    {
      type: "input",
      message: "OBS Websocket Address:",
      name: "address",
      default() {
        return "ws://127.0.0.1:4455";
      },
    },
    {
      type: "password",
      message: "OBS Websocket (leave blank for no password):",
      mask: "*",
      name: "password",
    },
  ]);
}

export async function getATEMCredentials(): Promise<{ address: string } | null> {

  const { useAtem }: { useAtem: boolean } = await inquirer.prompt([{
    type: "confirm",
    name: "useAtem",
    message: "Would you like to control an ATEM device over the network?",
    default: false
  }]);

  if (useAtem) {

    const { address }: { address: string } = await inquirer.prompt([{
      type: "input",
      message: "ATEM Address:",
      name: "address"
    }]);

    return { address };
  } else {
    return null;
  }

};

export async function getCredentials() {
  const tm = await getTournamentManagerCredentials();
  const obs = await getOBSCredentials();
  const atem = await getATEMCredentials();

  return { tm, obs, atem };
}

async function keypress() {
  return new Promise((resolve, reject) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', resolve);
  });
};

export async function connectTM({
  address,
  password,
}: {
  address: string;
  password: string;
}) {
  const client = new Client(
    `http://${address}`,
    AuthenticatedRole.ADMINISTRATOR,
    password
  );

  try {
    await client.connect();
  } catch (e: any) {
    console.log("❌ Tournament Manager: " + e.message);

    if (e.message.includes("cookie")) {
      console.log("\nCould not automatically generate cookie. Check to ensure you are connecting to the correct address.");
    } else if (e.message.includes("ECONNREFUSED")) {
      console.log("\nCould not connect to the Tournament Manager server. Ensure you have started it and that the address is correct. ");
    };

    await keypress();
    process.exit(1);
  }

  return client;
}

export async function connectOBS(creds: { address: string; password: string } | null) {
  const obs = new OBSWebSocket();

  if (!creds) {
    return null;
  }

  try {
    await obs.connect(creds.address, creds.password);
    return obs;
  } catch (e: any) {
    console.log("❌ Open Broadcaster Studio: ", e);

    await keypress();
    process.exit(1);
  };
}

export async function connectATEM(creds: { address: string } | null): Promise<Atem | null> {

  if (!creds?.address) {
    return null;
  };

  return new Promise((resolve) => {
    const atem = new Atem();

    // In order to suppress a message, add nothing listeners
    process.on("exit", () => { });
    process.on("uncaughtException", () => { });
    process.on("unhandledRejection", () => { });

    atem.connect(creds?.address);

    const timeout = setTimeout(async () => {
      console.log("❌ ATEM: Could not connect to switcher");
      atem.disconnect();

      await keypress();
      process.exit(1);
    }, 15000);

    atem.on("connected", () => {
      clearTimeout(timeout);
      atem.on("info", message => console.log(`[${new Date().toISOString()}] [atem] info: ${message}`));
      atem.on("error", message => console.log(`[${new Date().toISOString()}] [atem] error: ${message}`));

      resolve(atem)
    });
  });
};