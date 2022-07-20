import { AudienceDisplayMode, AudienceDisplayOptions } from "vex-tm-client/out/Fieldset";
import { getCredentials, connectTM, connectOBS, connectATEM } from "./authenticate";
import { getOBSAssociations, getATEMAssociations, getAudienceDisplayOptions, getDivision, getFieldset, getRecordingPath } from "./configuration";

(async function () {

  console.log(`tm-obs-switcher v${require("../package.json").version}`);
  console.log("Created by Brendan McGuire (brendan@bren.app)\n");

  // Prompt the user for credentials
  const creds = await getCredentials();

  console.log("\nConnecting to servers...");

  const tm = await connectTM(creds.tm);
  console.log("✅ Tournament Manager");

  const obs = await connectOBS(creds.obs);
  if (obs) {
    console.log("✅ Open Broadcaster Studio");
  }

  const atem = await connectATEM(creds.atem);
  if (atem) {
    console.log("✅ ATEM");
  };

  console.log("");

  // Configuration
  const division = await getDivision(tm);
  const fieldset = await getFieldset(tm);
  const fields = new Map(fieldset.fields.map((f) => [f.id, f]));
  const obsAssociations = await getOBSAssociations(fieldset, obs);
  const atemAssociations = await getATEMAssociations(fieldset, atem);

  console.log("");

  const audienceDisplayOptions = await getAudienceDisplayOptions();
  const timestampFile = await getRecordingPath(obs);
  console.log("");

  let queued = "";
  let started = false;
  let matchCount = 0;

  fieldset.ws.on("message", async (data) => {
    const message = JSON.parse(data.toString());
    const status = await obs?.send("GetStreamingStatus");

    // Get the current "stream time" in seconds
    let timecode = "00:00:00";
    if (status?.recording) {
      timecode = (status["rec-timecode"] ?? "00:00:00").split(".")[0];
    } else if (status?.streaming) {
      timecode = (status["stream-timecode"] ?? "00:00:00").split(".")[0];
    };

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


      if (obs && obsAssociations) {
        console.log(`[${new Date().toISOString()}] [${timecode}] info: ${message.name} queued on ${name}, switching OBS to scene ${obsAssociations[id]}`);
        await obs.send("SetCurrentScene", { "scene-name": obsAssociations[id] });
      }

      if (atem && atemAssociations) {
        console.log(`[${new Date().toISOString()}] [${timecode}] info: ${message.name} queued on ${name}, switching ATEM to channel ${atemAssociations[id]}`);
        atem.changeProgramInput(atemAssociations[id]);
      };

      if (audienceDisplayOptions.queueIntro) {
        fieldset.setScreen(AudienceDisplayMode.INTRO);
      }

      // keep track of the queued match
      queued = message.name;
      started = false;

      // Force the scene to switch when the match starts
    } else if (message.type === "matchStarted") {
      const id = message.fieldId;

      let name = fields.get(id)?.name;
      if (!name) {
        name = "Unknown";
      };

      if (obs && obsAssociations) {
        console.log(`[${new Date().toISOString()}] [${timecode}] info: ${message.name} queued on ${name}, switching OBS to scene ${obsAssociations[id]}`);
        await obs.send("SetCurrentScene", { "scene-name": obsAssociations[id] });
      }

      if (atem && atemAssociations) {
        console.log(`[${new Date().toISOString()}] [${timecode}] info: ${message.name} queued on ${name}, switching ATEM to channel ${atemAssociations[id]}`);
        atem.changeProgramInput(atemAssociations[id]);
      };

      if (!started) {
        started = true;

        await division.refresh();
        const match = division.matches.find(match => match.name === queued);

        timestampFile?.write(`${new Date().toISOString()},${timecode},${queued},${match?.redTeams.join(" ")},${match?.blueTeams.join(" ")}\n`);
      }

    } else if (message.type === "timeUpdated") {

      // Force the audience display to be in-match during the entire match
      if (audienceDisplayOptions.preventSwitch) {
        fieldset.setScreen(AudienceDisplayMode.IN_MATCH);
      };

    } else if (message.type === "matchStopped") {

      matchCount++;

      // Show saved score 3 seconds after the match ends
      if (audienceDisplayOptions.rankings && matchCount % 6 == 0) {
        setTimeout(() => {
          console.log(`[${new Date().toISOString()}] info: switching audience display to Rankings`);
          fieldset.setScreen(AudienceDisplayMode.RANKINGS);
        }, 3000);
      } else if (audienceDisplayOptions.savedScore) {
        setTimeout(() => {
          console.log(`[${new Date().toISOString()}] info: switching audience display to Saved Match Results`);
          fieldset.setScreen(AudienceDisplayMode.SAVED_MATCH_RESULTS);
        }, 3000);
      };

    } else if (message.type === "displayUpdated") {
      const mode = message.display as AudienceDisplayMode;
      const option = message.displayOption as AudienceDisplayOptions;

      // Disable show saved score when you switch display to elim bracket or alliance selection
      if (mode == AudienceDisplayMode.ELIM_BRACKET || mode == AudienceDisplayMode.ALLIANCE_SELECTION) {
        if (audienceDisplayOptions.savedScore) {
          console.log(`[${new Date().toISOString()}] info: detected switch to ${AudienceDisplayMode[mode]}, disabling show saved score & rankings automation`);
          audienceDisplayOptions.savedScore = false;
          audienceDisplayOptions.rankings = false;
        };
      };

    };
  });
})();
