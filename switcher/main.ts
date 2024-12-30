import {
  getCredentials,
  connectTM,
  connectOBS,
  connectATEM,
} from "./utils/authenticate.js";
import {
  getAssociations,
  getAudienceDisplayOptions,
  getDisplayAssociations,
  initFileHandles,
  getRecordingOptions,
  getTournamentAttachments,
} from "./utils/input.js";
import { Behavior } from "behavior.js";
import { log, setLogFile } from "./utils/logging.js";
import { promptForUpdate } from "./utils/update.js";
import { AudienceDisplayBehavior } from "behaviors/display.js";
import { HeartbeatBehavior } from "behaviors/heartbeat.js";
import { LoggingBehavior } from "behaviors/logging.js";
import { RecordingBehavior } from "behaviors/recording.js";
import { CoreSwitcherBehavior } from "behaviors/switcher.js";

import { version } from "~data/package.json" assert { type: "json" };

const BEHAVIORS: { [key: string]: Behavior } = {
  AudienceDisplayBehavior,
  HeartbeatBehavior,
  LoggingBehavior,
  RecordingBehavior,
  CoreSwitcherBehavior,
};

async function main() {
  console.log(
    `TM Switcher v${version} - Created by Brendan McGuire (brendan@bren.app)`
  );

  await promptForUpdate();
  console.log("");

  // Logging
  const handles = await initFileHandles();
  setLogFile(handles.log);

  console.log(`Log File: ${handles.logPath}`);
  console.log(`Match Timestamps: ${handles.timestampPath}\n`);

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
  const displayAssociations = await getDisplayAssociations(obs, atem);

  console.log("");

  const audienceDisplayOptions = await getAudienceDisplayOptions();
  const recordingOptions = await getRecordingOptions(obs);

  console.log("");

  for (const [name, behavior] of Object.entries(BEHAVIORS)) {
    log("info", `Running behavior: ${name}`, false);
    await behavior({
      attachments,
      audienceDisplayOptions,
      associations,
      displayAssociations,
      recordingOptions,
      connections: { tm, obs, atem },
      handles,
      credentials: creds,
    });
  }
}

main();
