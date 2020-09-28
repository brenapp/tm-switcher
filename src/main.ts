import inquirer from "inquirer";
import Fieldset, { Field } from "vex-tm-client/out/Fieldset";
import { getCredentials, connectTM, connectOBS } from "./authenticate";

(async function () {
  // Prompt the user for credentials
  const creds = await getCredentials();

  console.log("\nConnecting to servers...");

  const tm = await connectTM(creds.tm);
  console.log("✅ Tournament Manager");

  const obs = await connectOBS(creds.obs);
  console.log("✅ Open Broadcaster Studio");

  console.log("");

  // Have the user select a division
  let response = await inquirer.prompt([
    {
      name: "fieldset",
      type: "list",
      message: "Select Fieldset to Control",
      choices: tm.fieldsets.map((d) => d.name),
    },
  ]);
  const fieldset = tm.fieldsets.find(
    (set) => set.name === response.fieldset
  ) as Fieldset;

  // Set up associations between scenes and fields
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
  }

  console.log("Done!");

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
    }
  });
})();
