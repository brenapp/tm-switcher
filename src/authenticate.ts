import inquirer from "inquirer";
import Client, { AuthenticatedRole } from "vex-tm-client";
import OBSWebSocket from "obs-websocket-js";

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
}> {
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

export async function getCredentials() {
  const tm = await getTournamentManagerCredentials();
  const obs = await getOBSCredentials();

  return { tm, obs };
}

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

    process.exit(1);
  }

  return client;
}

export async function connectOBS(creds: { address: string; password: string }) {
  const obs = new OBSWebSocket();
  obs.connect(creds);

  return new Promise<OBSWebSocket>((resolve, reject) => {
    obs.on("ConnectionOpened", () => resolve(obs));
    obs.on("AuthenticationFailure", () => {
      console.log("❌ Open Broadcaster Studio: Authentication failure");
      process.exit(1);
    });
    obs.on("ConnectionClosed", () => {
      console.log("❌ Open Broadcaster Studio: Connection closed by remote");
      process.exit(1);
    });
  });
}