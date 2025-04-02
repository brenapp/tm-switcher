import { networkInterfaces, tmpdir } from "os";
import { join } from "path";
import { FileHandle, open } from "fs/promises";

import { version } from "~data/package.json" assert { type: "json" };

let LOG_HANDLE: FileHandle | null = null;

export function log(level: string, message: string, stdout?: string | false) {
  if (stdout) {
    console.log(stdout);
  } else if (stdout !== false) {
    console.log(`[${new Date().toISOString()}] ${level}: ${message}`);
  }
  LOG_HANDLE?.write(`[${new Date().toISOString()}] ${level}: ${message}\n`);
}

export function setLogFile(handle: FileHandle) {
  LOG_HANDLE = handle;
}

export function getLogFile() {
  return LOG_HANDLE;
}

export type FileHandles = {
  timestamp: FileHandle;
  log: FileHandle;
};

export type FilePaths = {
  logPath: string;
  timestampPath: string;
  configPath: string;
};

export async function getFilePaths(): Promise<FilePaths> {
  const directory = tmpdir();

  const date = new Date();
  const timestamp = [date.getFullYear(), date.getMonth() + 1, date.getDate()].join("-")

  const timestampPath = join(directory, `tm_switcher_${timestamp}_times.csv`);
  const configPath = join(directory, `tm_switcher_${timestamp}_config.json`);
  const logPath = join(directory, `tm_switcher_${timestamp}_log.txt`);

  return { logPath, timestampPath, configPath };
}

export async function initLogFile(path: string) {
  const log = await open(path, "a");

  await log.write(
    `\n\ntm-switcher v${version} started at ${new Date().toISOString()}\n`
  );
  await log.write(`OS:  ${process.platform} ${process.arch}\n`);
  await log.write(`Node Version:  ${process.version}\n`);
  await log.write(`Temp Dir:  ${tmpdir()}\n`);

  await log.write(`Network Interfaces: \n`);
  const interfaces = networkInterfaces();
  
  for (const [name, iface] of Object.entries(interfaces)) {
    await log.write(`  ${name}: ${iface?.map((i) => i.address).join(", ")}\n`);
  }

  return log;
}

export async function initTimestampFile(path: string) {
  return open(path, "a");
}