import inquirer from "inquirer";
import Client, { AuthenticatedRole } from "vex-tm-client";
import OBSWebSocket from "obs-websocket-js";
import ATEM from "applest-atem";

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

  const { enable } = await inquirer.prompt({
    type: "confirm",
    name: "enable",
    message: "Control OBS?",
  });

  if (!enable) {
    return null;
  };

  return inquirer.prompt([
    {
      type: "input",
      message: "OBS Websocket Address:",
      name: "address",
      default() {
        return "127.0.0.1:4444";
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

  const { enable } = await inquirer.prompt({
    type: "confirm",
    name: "enable",
    message: "Control an ATEM?",
  });

  if (!enable) {
    return null;
  };

  return inquirer.prompt([
    {
      type: "input",
      message: "ATEM Network Address:",
      name: "address",
    }
  ])
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

  if (!creds) {
    return null;
  };

  const obs = new OBSWebSocket();

  try {
    await obs.connect(creds);
    return obs;
  } catch (e: any) {
    console.log("❌ Open Broadcaster Studio: ", e);

    await keypress();
    process.exit(1);
  };
}

export async function connectATEM(credentials: { address: string } | null) {
  if (!credentials) {
    return null;
  }

  const atem = new ATEM();

  try {
    await atem.connect(credentials.address);
    return atem;
  } catch (e: any) {
    console.log("❌ ATEM: ", e);

    await keypress();
    process.exit(1);
  }
};