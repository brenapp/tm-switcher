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
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }

  return client;
}

export async function connectOBS(creds: { address: string; password: string }) {
  const obs = new OBSWebSocket();
  obs.connect(creds);

  return new Promise<OBSWebSocket>((resolve, reject) => {
    obs.on("ConnectionOpened", () => resolve(obs));
  });
}
