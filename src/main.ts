import inquirer from "inquirer";
import ObsWebSocket from "obs-websocket-js";
import Client from "vex-tm-client";
import Fieldset, { Field } from "vex-tm-client/out/Fieldset";
import { getCredentials, connectTM, connectOBS } from "./authenticate";

async function getFieldset(tm: Client) {
   let response = await inquirer.prompt([
    {
      name: "fieldset",
      type: "list",
      message: "Which fieldset do you wish to control? ",
      choices: tm.fieldsets.map((d) => d.name),
    },
  ]);

  return tm.fieldsets.find(
    (set) => set.name === response.fieldset
  ) as Fieldset;
};

async function getAssociations(fieldset: Fieldset, obs: ObsWebSocket) {
  const fields = fieldset.fields;
  const scenes = await obs.send("GetSceneList");

  const associations: string[] = [];

  for (const field of fields) {
    const response = await inquirer.prompt([
      {
        name: "scene",
        type: "list",
        message: `What scene do you want to associate with ${field.name}? `,
        choices: scenes.scenes.map((s) => s.name),
      },
    ]);
    associations[field.id] = response.scene;
  };

  return associations;
};

function toTime(seconds: number) {
  let minutes = Math.floor(seconds / 60);
  let secondsLeft = seconds % 60;

  // Pad with 0s
  let minuteString = minutes < 10 ? `0${minutes}` : `${minutes}`;
  let secondString = minutes < 10 ? `0${seconds}` : `${seconds}`;

  return `${minuteString}:${secondString}`;
};

(async function () {

  // Prompt the user for credentials
  const creds = await getCredentials();

  console.log("\nConnecting to servers...");

  const tm = await connectTM(creds.tm);
  console.log("✅ Tournament Manager");

  const obs = await connectOBS(creds.obs);
  console.log("✅ Open Broadcaster Studio\n");

  // Configuration
  const fieldset = await getFieldset(tm);
  const fields = fieldset.fields;
  const associations = await getAssociations(fieldset, obs);
  console.log("Done!");

  // Bottom Bar for Match Status
  const status = new inquirer.ui.BottomBar();

  fieldset.ws.on("message", async (data) => {
    const message = JSON.parse(data.toString());

    if (message.type === "fieldMatchAssigned") {
      const id = message.fieldId;

      // Elims won't have an assigned field, they can switch early, but we'll
      // switch when the match starts
      if (!id) {
        return;
      }

      console.log(
        `${message.name} queued on ${fields[id - 1].name}, switching to scene ${
          associations[id]
        }`
      );
      await obs.send("SetCurrentScene", { "scene-name": associations[id] });

      // Force the scene to switch when the match starts
    } else if (message.type === "matchStarted") {
      const id = message.fieldId;

      console.log(
        `Match started on ${fields[id - 1].name}, switching to scene ${
          associations[id]
        }`
      );
      await obs.send("SetCurrentScene", { "scene-name": associations[id] });


    // Update the bottom bar timer
    };
  });
})();
