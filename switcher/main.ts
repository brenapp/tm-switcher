import {
  getCredentials,
  connectTM,
  connectOBS,
  connectATEM,
} from "./utils/authenticate";
import {
  getAssociations,
  getAudienceDisplayOptions,
  getDisplayAssociations,
  initFileHandles,
  getRecordingOptions,
  getTournamentAttachments,
} from "./utils/input";
import { log, setLogFile } from "./utils/logging";
import { promptForUpdate } from "./utils/update";
import { BEHAVIORS } from "./behaviors";

import "./behaviors/display";
import "./behaviors/recording";
import "./behaviors/switcher";
import "./behaviors/logging";
import "./behaviors/heartbeat";

async function main() {
  console.log(
    `TM Switcher v${
      require("../../package.json").version
    } - Created by Brendan McGuire (brendan@bren.app)`
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
