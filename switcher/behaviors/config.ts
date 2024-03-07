import { Behavior, SwitcherBehavior } from "./index";
import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";

export type SwitcherConfig = Pick<SwitcherBehavior,
    "recordingOptions" | "associations" | "audienceDisplayOptions">

const CONFIG_PATH = join(homedir(), ".config", "tm-switcher", "config.json");

export function packBehavior({ associations, audienceDisplayOptions, recordingOptions }: SwitcherBehavior): SwitcherConfig {
    return {
        associations,
        audienceDisplayOptions,
        recordingOptions
    }
};

export async function getConfig(): Promise<SwitcherConfig> {

    const config: SwitcherConfig = {
        associations: {},
        audienceDisplayOptions: {
            queueIntro: false,
            savedScore: false,
            flashRankings: false
        },
        recordingOptions: {
            recordIndividualMatches: false
        }
    }

    try {
        const buffer = await readFile(CONFIG_PATH);
        const text = buffer.toString();



        return config;
    } catch {
        return config;
    }
};

Behavior("SAVE_CONFIG", async (options) => {
    const config = packBehavior(options);
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
});