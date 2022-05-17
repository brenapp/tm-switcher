import inquirer from "inquirer";
import ObsWebSocket from "obs-websocket-js";
import Client from "vex-tm-client";
import Fieldset, { AudienceDisplayMode } from "vex-tm-client/out/Fieldset";
import { getCredentials, connectTM, connectOBS } from "./authenticate";

async function getFieldset(tm: Client) {
  const response: { fieldset: string } = await inquirer.prompt([
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
  const fields = new Map(fieldset.fields.map((f) => [f.id, f]));
  const associations = await getAssociations(fieldset, obs);
  console.log("Done!");

  fieldset.ws.on("message", async (data) => {
    const message = JSON.parse(data.toString());

    const status = await obs.send("GetStreamingStatus");

    // Get the current "stream time" in seconds
    let timecode = "00:00:00";
    if (status.recording) {
      timecode = (status["rec-timecode"] ?? "00:00:00").split(".")[0];
    } else if (status.streaming) {
      timecode = (status["stream-timecode"] ?? "00:00:00").split(".")[0];
    }

    if (message.type === "fieldMatchAssigned") {
      const id = message.fieldId;

      // Elims won't have an assigned field, they can switch early, but we'll
      // switch when the match starts
      if (!id) {
        return;
      }

      let name = fields.get(id)?.name;
      if (!name) {
        name = "Unknown";
      };

      console.log(`[${new Date().toISOString()}] [${timecode}] info: ${message.name} queued on ${name}, switching to scene ${associations[id]}`);
      
      await obs.send("SetCurrentScene", { "scene-name": associations[id] });
      fieldset.setScreen(AudienceDisplayMode.INTRO);

      // Force the scene to switch when the match starts
    } else if (message.type === "matchStarted") {
      const id = message.fieldId;

      let name = fields.get(id)?.name;
      if (!name) {
        name = "Unknown";
      };

      console.log(`[${new Date().toISOString()}] [${timecode}] info: match started on ${name}, switching to scene ${associations[id]}`);
      await obs.send("SetCurrentScene", { "scene-name": associations[id] });
      fieldset.setScreen(AudienceDisplayMode.IN_MATCH);
    };
  });
})();
