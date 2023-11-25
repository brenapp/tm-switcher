
import { Client, FieldsetAudienceDisplay, Match, MatchRound, MatchTuple } from "vex-tm-client";
import {
  getCredentials,
  connectTM,
  connectOBS,
  connectATEM
} from "./authenticate.js";

import {
  AudienceDisplayOptions,
  FieldAssociations,
  RecordingOptions,
  TournamentAttachments,
  getAssociations,
  getAudienceDisplayOptions,
  getFileHandles,
  getRecordingOptions,
  getTournamentAttachments
} from "./input.js";
import OBSWebSocket from "obs-websocket-js";
import { Atem } from "atem-connection";
import { FileHandle } from "fs/promises";

export type SwitcherBehavior = {
  attachments: TournamentAttachments;
  audienceDisplayOptions: AudienceDisplayOptions;
  associations: FieldAssociations;
  recordingOptions: RecordingOptions;
  connections: {
    tm: Client;
    obs: OBSWebSocket | null;
    atem: Atem | null;
  }
};

export type Behavior = (behavior: SwitcherBehavior) => Promise<void>;

const BEHAVIORS: { [key: string]: Behavior } = {};

export function Behavior(name: string, behavior: Behavior) {
  BEHAVIORS[name] = behavior;
};

let LOG_HANDLE: FileHandle | null = null;

export function log(level: string, message: string, stdout?: string | false) {
  if (stdout) {
    console.log(stdout);
  } else if (stdout !== false) {
    console.log(`[${new Date().toISOString()}] ${level}: ${message}`);
  }
  LOG_HANDLE?.write(`[${new Date().toISOString()}] ${level}: ${message}\n`);
};

async function main() {
  console.log(`tm-obs-switcher v${process.env.npm_package_version}`);
  console.log("Created by Brendan McGuire (brendan@bren.app)\n");

  // Logging
  const handles = await getFileHandles();
  LOG_HANDLE = handles.log;

  console.log(`Log File: ${handles.logPath}\n`);

  // Prompt the user for credentials
  const creds = await getCredentials();

  console.log("");
  log("info", "Connecting to servers: ", "Connecting to servers: ");

  const tm = await connectTM(creds.tm);
  log("info", "Connected to Tournament Manager", "✅ Tournament Manager");

  const obs = await connectOBS(creds.obs);
  if (obs) {
    log("info", "Connected to OBS", `✅ OBS`);
  }

  const atem = await connectATEM(creds.atem);
  if (atem) {
    log("info", "Connected to ATEM", "✅ ATEM");
  }

  console.log("");

  // Configuration
  const attachments = await getTournamentAttachments(tm);
  const associations = await getAssociations(attachments.fieldset, obs, atem);

  console.log("");

  const audienceDisplayOptions = await getAudienceDisplayOptions();
  const recordingOptions = await getRecordingOptions(obs);

  console.log("");

  for (const [name, behavior] of Object.entries(BEHAVIORS)) {
    await behavior({
      attachments,
      audienceDisplayOptions,
      associations,
      recordingOptions,
      connections: { tm, obs, atem }
    });
  }

  // Cleanup
  process.on("exit", async () => {
    log("info", "exiting...");
    await attachments.fieldset.disconnect();
  });
}

function getMatchName(match: MatchTuple) {
  switch (match.round) {
    case MatchRound.Qualification:
      return `Qualification ${match.instance}`;
    case MatchRound.Practice:
      return `Practice ${match.instance}`;

    case MatchRound.RoundRobin:
      return `Round Robin ${match.instance}`;

    case MatchRound.RoundOf128:
      return `Round Of 128 ${match.instance}-${match.match}`;

    case MatchRound.RoundOf64:
      return `Round Of 64 ${match.instance}-${match.match}`;

    case MatchRound.RoundOf32:
      return `Round Of 32 ${match.instance}-${match.match}`;

    case MatchRound.RoundOf16:
      return `Round Of 16 ${match.instance}-${match.match}`;

    case MatchRound.Quarterfinal:
      return `Quarterfinal ${match.instance}-${match.match}`;

    case MatchRound.Semifinal:
      return `Semifinal ${match.instance}-${match.match}`;

    case MatchRound.Final:
      return `Final ${match.instance}-${match.match}`;

    case MatchRound.TopN:
      return `Final ${match.instance}-${match.match}`;

    case MatchRound.Skills:
      return `Skills`;

    default:
      return `${match.round} ${match.instance}`;

  }
};

/**
 * Logging
 */
Behavior("LOGGING", async ({ associations, attachments, connections, recordingOptions }) => {

  const { obs } = connections;

  async function getCurrentTimecode() {
    const recordStatus = await obs?.call("GetRecordStatus");
    const streamStatus = await obs?.call("GetStreamStatus");

    // Get the current "stream time" in seconds
    let timecode = "00:00:00";

    if (recordStatus && recordStatus.outputActive && !recordingOptions.recordIndividualMatches) {
      timecode = recordStatus.outputTimecode;
    } else if (streamStatus && streamStatus.outputActive) {
      timecode = streamStatus.outputTimecode;
    };

    return timecode;
  };

  const { fieldset } = attachments;

  let currentMatch: MatchTuple | null = null;

  fieldset.addEventListener("matchStarted", async event => {
    const timecode = await getCurrentTimecode();
    const { fieldID } = event.detail;
    const association = associations[fieldID];

    const matchName = currentMatch ? getMatchName(currentMatch) : "Match";
    log("info", `[${timecode}] ${matchName} started on field ${fieldID} [OBS: ${association?.obs ?? "none"}, ATEM: ${association?.atem ?? "none"}]`);


  });

  fieldset.addEventListener("matchStopped", async event => {
    const timecode = await getCurrentTimecode();
    const { fieldID } = event.detail;
    const matchName = currentMatch ? getMatchName(currentMatch) : "Match";

    log("info", `[${timecode}] ${matchName} ended on field ${fieldID}`);
  });

  fieldset.addEventListener("fieldActivated", async event => {
    const timecode = await getCurrentTimecode();
    const { fieldID } = event.detail;
    const association = associations[fieldID];

    const matchName = currentMatch ? getMatchName(currentMatch) : "Match";
    log("info", `[${timecode}] ${matchName} activated on field ${fieldID} [OBS: ${association?.obs ?? "none"}, ATEM: ${association?.atem ?? "none"}]`);
  });

  fieldset.addEventListener("fieldMatchAssigned", async event => {
    const timecode = await getCurrentTimecode();
    const { fieldID, match } = event.detail;
    const association = associations[fieldID];

    currentMatch = match;

    const matchName = getMatchName(match);
    log("info", `[${new Date().toISOString()}] [${timecode}] info: ${matchName} assigned to field ${fieldID} [OBS: ${association?.obs ?? "none"}, ATEM: ${association?.atem ?? "none"}]`);
  });
});

/**
 * Core Switcher Behavior
 **/
Behavior("CORE_SWITCHER", async ({ associations, attachments, connections }) => {

  const { fieldset } = attachments;
  const { obs, atem } = connections;

  async function switchTo(fieldID: number) {
    const association = associations[fieldID];

    if (obs && association?.obs) {
      await obs.call("SetCurrentProgramScene", { sceneName: association.obs });
    }

    if (atem && association?.atem) {
      atem.changeProgramInput(association.atem);
    };
  }

  fieldset.addEventListener("matchStarted", async match => {
    const { fieldID } = match.detail;
    await switchTo(fieldID);
  });

  fieldset.addEventListener("fieldActivated", async match => {
    const { fieldID } = match.detail;
    await switchTo(fieldID);
  });

});

/**
 * Match Recording
 **/
Behavior("MATCH_RECORDING", async ({ associations, attachments, connections, recordingOptions }) => {

  const { recordIndividualMatches } = recordingOptions;
  const { division, fieldset } = attachments;
  const { obs } = connections;

  let defaultFileFormat = "";
  if (obs) {
    const result = await obs.call("GetProfileParameter", { parameterCategory: "Output", parameterName: "FilenameFormatting" })
    defaultFileFormat = result.parameterValue;
  };

  process.on("exit", async () => {
    await stopRecording();
  });

  if (!recordIndividualMatches) {
    return;
  };

  async function startRecording() {
    if (!obs || !recordIndividualMatches) return;

    const { outputActive } = await obs.call("GetRecordStatus");
    if (outputActive) return;

    const filename = `${division?.name ?? ""}_${(currentMatch ? getMatchName(currentMatch) : "Match").replaceAll(/ /g, "_")}`;

    await obs.call("SetProfileParameter", { parameterCategory: "Output", parameterName: "FilenameFormatting", parameterValue: filename })
    await obs.call("StartRecord");
  };

  async function stopRecording() {
    if (!obs || !recordIndividualMatches) return;

    const { outputActive } = await obs.call("GetRecordStatus");
    if (!outputActive) return;

    await obs.call("StopRecord");
    await obs.call("SetProfileParameter", { parameterCategory: "Output", parameterName: "FilenameFormatting", parameterValue: defaultFileFormat })
  }

  let currentMatch: MatchTuple | null = null;

  fieldset.addEventListener("fieldMatchAssigned", async event => {
    const { match } = event.detail;
    currentMatch = match;
  });

  fieldset.addEventListener("matchStarted", async event => {
    await startRecording();
  });

  fieldset.addEventListener("matchStopped", async event => {
    setTimeout(async () => {
      await stopRecording();
    }, 3000);
  });
});

/**
 * Audience Display Automation
 **/
Behavior("AUDIENCE_DISPLAY", async ({ attachments, audienceDisplayOptions }) => {

  const { fieldset } = attachments;

  let currentMatch: MatchRound | null = null;

  fieldset.addEventListener("fieldMatchAssigned", async event => {
    currentMatch = event.detail.match.round;
  });

  fieldset.addEventListener("fieldActivated", async event => {
    if (audienceDisplayOptions.queueIntro) {
      await fieldset.send({
        cmd: "setScreen",
        display: FieldsetAudienceDisplay.Intro
      });
    }

  });

  fieldset.addEventListener("matchStarted", async event => {
    await fieldset.send({
      cmd: "setScreen",
      display: FieldsetAudienceDisplay.InMatch
    });
  });

  fieldset.addEventListener("matchStopped", () => {
    setTimeout(async () => {
      await fieldset.send({
        cmd: "setScreen",
        display: FieldsetAudienceDisplay.SavedMatchResults
      });
    }, 3000);
  });

});

main();