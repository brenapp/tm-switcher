import {
  getCredentials,
  connectTM,
  connectOBS,
} from "./utils/authenticate.js";
import {
  getSwitcherOptions,
} from "./utils/input.js";
import { Behavior, SwitcherOptions } from "behavior.js";
import { getFilePaths, initLogFile, log, setLogFile } from "./utils/logging.js";
import { promptForUpdate } from "./utils/update.js";

import { AudienceDisplayBehavior } from "behaviors/display.js";
import { HeartbeatBehavior } from "behaviors/heartbeat.js";
import { LoggingBehavior } from "behaviors/logging.js";
import { RecordingBehavior } from "behaviors/recording.js";
import { CoreSwitcherBehavior } from "behaviors/switcher.js";

import { version } from "~data/package.json" assert { type: "json" };
import { saveOptions } from "utils/options.js";

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
  const paths = await getFilePaths();
  const logHandle = await initLogFile(paths.logPath);
  const timestampHandle = await initLogFile(paths.timestampPath);

  setLogFile(logHandle);

  console.log(`Log File: ${paths.logPath}`);
  console.log(`Match Timestamps: ${paths.timestampPath}`);
  console.log(`Configuration: ${paths.configPath}\n`);

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


  console.log("");

  const connections = { tm, obs };

  const options = await getSwitcherOptions(paths.configPath, connections);
  saveOptions(paths.configPath, options);

  for (const [name, behavior] of Object.entries(BEHAVIORS)) {
    log("info", `Running behavior: ${name}`, false);
    await behavior({
      ...options,
      connections,
      handles: { log: logHandle, timestamp: timestampHandle },
      credentials: creds,
    });
  }
}

main();
