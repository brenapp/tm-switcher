import { V3MatchTuple, V3MatchTupleSkillsType } from "vex-tm-client";
import { getCredentials, connectTM, connectOBS, connectATEM } from "./authenticate";
import { getAssociations, getFieldset, getRecordingOptions } from "./input";

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
  }

  console.log("");

  // Configuration
  const fieldset = await getFieldset(tm);
  const associations = await getAssociations(fieldset, obs, atem);

  console.log("");

  // const audienceDisplayOptions = await getAudienceDisplayOptions();
  const { handle: timestampFile, recordIndividualMatches, division } = await getRecordingOptions(tm, obs);

  console.log("");

  let currentMatch: V3MatchTuple | null = null;

  async function getCurrentTimecode() {
    const recordStatus = await obs?.call("GetRecordStatus");
    const streamStatus = await obs?.call("GetStreamStatus");

    // Get the current "stream time" in seconds
    let timecode = "00:00:00";

    if (recordStatus && recordStatus.outputActive && !recordIndividualMatches) {
      timecode = recordStatus.outputTimecode;
    } else if (streamStatus && streamStatus.outputActive) {
      timecode = streamStatus.outputTimecode;
    };

    return timecode;
  };

  function matchTupleToString(match: V3MatchTuple | null) {
    if (!match) return "Match";

    switch (match.round) {
      case "PRACTICE":
      case "ROUND_ROBIN":
      case "NONE":
      case "TOP_N":
      case "F":
      case "QUAL": {
        return `${match.round} ${match.match}`;
      }
      case "R128":
      case "R64":
      case "R32":
      case "R16":
      case "QF":
      case "SF": {
        return `${match.round} ${match.instance}-${match.match}`;
      }

      case "SKILLS": {
        const skills: V3MatchTupleSkillsType[] = ["NO_SKILLS", "PROGRAMMING", "DRIVER"];
        return `${skills?.[match.instance!] ?? ""} ${match.round}`
      };

      case "TIMEOUT": {
        return `${match.round}`;
      }

      default: {
        return JSON.stringify(match);
      }
    };

  };

  fieldset.on("ASSIGN_FIELD_MATCH", async message => {
    if (message.match) {
      currentMatch = message.match;
    }
  });

  // Switch the scene upon field activation (this is better than queuing for events with V5 field control)
  fieldset.on("FIELD_ACTIVATED", async message => {
    const field = message.fieldId;
    if (!field) return;

    const timecode = await getCurrentTimecode();
    const association = associations[field];

    console.log(`[${new Date().toISOString()}] [${timecode}] info: ${matchTupleToString(currentMatch)} queued on ${fieldset.fields[field]}${association.obs ? ", switching to scene " + association.obs : ""}${association.atem ? `, ATEM ${association.atem}` : ""}`);

    if (obs && association.obs) {
      await obs.call("SetCurrentProgramScene", { sceneName: association.obs });
    }

    if (atem && association.atem) {
      atem.changeProgramInput(association.atem);
    };

  });

  // Switch the scene upon field activation (this is better than queuing for events with V5 field control)
  fieldset.on("MATCH_STARTED", async message => {
    const field = message.fieldId;
    if (!field) return;

    const timecode = await getCurrentTimecode();
    const association = associations[field];

    console.log(`[${new Date().toISOString()}] [${timecode}] info: ${matchTupleToString(currentMatch)} started on ${fieldset.fields[field]}${association.obs ? ", switching to OBS scene " + association.obs : ""}${association.atem ? ` ATEM ${association.atem}` : ""}`);

    if (obs && association.obs) {
      await obs.call("SetCurrentProgramScene", { sceneName: association.obs });
    }

    if (atem && association.atem) {
      atem.changeProgramInput(association.atem);
    };

    // Record the match
    if (obs && recordIndividualMatches) {
      await obs.call("StartRecord");
    };

    // Write the timestamp file
    await timestampFile?.write(`${new Date().toISOString()},${timecode},${matchTupleToString(currentMatch)}\n`);

  });

})();

process.on("exit", () => {
  console.log("exiting...");
});