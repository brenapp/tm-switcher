import { getCredentials, connectTM, connectOBS } from "./authenticate";
import { AudienceDisplayMode, AudienceDisplayOptions } from "vex-tm-client/out/Fieldset";
import { getAssociations, getAudienceDisplayOptions, getFieldset, getRecordingPath } from "./input";

(async function () {

  console.log(`tm-obs-switcher v${require("../package.json").version}`);
  console.log("Created by Brendan McGuire (brendan@bren.app)\n");

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

  console.log("");

  const audienceDisplayOptions = await getAudienceDisplayOptions();
  const timestampFile = await getRecordingPath(tm);
  console.log("");

  let queued = "";
  let started = false;
  let matchCount = 0;

  fieldset.ws.on("message", async (data) => {
    const message = JSON.parse(data.toString());
    const recordStatus = await obs.call("GetRecordStatus");
    const streamStatus = await obs.call("GetStreamStatus");

    // Get the current "stream time" in seconds
    let timecode = "00:00:00";

    if (recordStatus.outputActive) {
      timecode = recordStatus.outputTimecode;
    } else if (streamStatus.outputActive) {
      timecode = streamStatus.outputTimecode;
    };


    /**
     * When a match is queued, switch to its associated scene
     */
    async function fieldMatchAssigned() {
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

      await obs.call("SetCurrentProgramScene", { sceneName: associations[id] });

      if (audienceDisplayOptions.queueIntro) {
        fieldset.setScreen(AudienceDisplayMode.INTRO);
      }

      // keep track of the queued match
      queued = message.name;
      started = false;
    };

    /**
     * When the match starts, switch the scene to the appropriate field, and log to the timestamp
     * file and console 
     **/
    async function matchStarted() {
      const id = message.fieldId;

      let name = fields.get(id)?.name;
      if (!name) {
        name = "Unknown";
      };

      console.log(`[${new Date().toISOString()}] [${timecode}] info: match ${started ? "resumed" : "started"} on ${name}, switching to scene ${associations[id]}`);
      await obs.call("SetCurrentProgramScene", { sceneName: associations[id] });

      if (!started) {
        started = true;
        timestampFile?.write(`${new Date().toISOString()},${timecode},${queued}\n`);
      }
    }

    /**
     * Every second during the match, prevent switching
     **/
    async function timeUpdated() {
      // Force the audience display to be in-match during the entire match
      if (audienceDisplayOptions.preventSwitch) {
        fieldset.setScreen(AudienceDisplayMode.IN_MATCH);
      };
    }

    /**
     * When the match ends, switch to the end graphic (if appropriate)
     **/
    async function matchStopped() {
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
    };

    /**
     * Disable showing saved score/rankings when the display switches to elim bracket or alliance selection
     **/
    async function displayUpdated() {
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


    // Dispatch each event appropriately
    switch (message.type) {
      case "fieldMatchAssigned": {
        await fieldMatchAssigned();
        break;
      }
      case "matchStarted": {
        await matchStarted();
        break;
      }
      case "timeUpdated": {
        await timeUpdated();
        break;
      }
      case "matchStopped": {
        await matchStopped();
        break;
      }
      case "displayUpdated": {
        await displayUpdated();
        break;
      }
    }
  });
})();
