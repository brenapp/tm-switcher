
import {
  getCredentials,
  connectTM,
  connectOBS,
  connectATEM
} from "./utils/authenticate";
import {
  getAssociations,
  getAudienceDisplayOptions,
  getFileHandles,
  getRecordingOptions,
  getTournamentAttachments
} from "./utils/input";
import { log, setLogFile } from "./utils/logging";
import { BEHAVIORS } from "./behaviors";

import "./behaviors/display";
import "./behaviors/recording";
import "./behaviors/switcher";
import "./behaviors/logging";
import "./behaviors/heartbeat";
import "./behaviors/config";

async function main() {
  console.log(`tm-switcher v${require("../../package.json").version}`);
  console.log("Created by Brendan McGuire (brendan@bren.app)\n");

  // Logging
  const handles = await getFileHandles();
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
      recordingOptions,
      connections: { tm, obs, atem },
      handles,
      credentials: creds
    });
  }
}


main();