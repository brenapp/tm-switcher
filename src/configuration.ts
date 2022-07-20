import inquirer from "inquirer";
import ObsWebSocket from "obs-websocket-js";
import Client from "vex-tm-client";
import Fieldset from "vex-tm-client/out/Fieldset";
import { join } from "path";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import Division from "vex-tm-client/out/Division";
import ATEM from "applest-atem";
import { keypress } from "./authenticate";

export async function getDivision(tm: Client) {
    const response: { division: string } = await inquirer.prompt([
        {
            name: "division",
            type: "list",
            message: "Which division do you wish to control? ",
            choices: tm.divisions.map((d) => d.name),
        },
    ]);

    return tm.divisions.find(
        (set) => set.name === response.division
    ) as Division;
};

export async function getFieldset(tm: Client) {
    const response: { fieldset: string } = await inquirer.prompt([
        {
            name: "fieldset",
            type: "list",
            message: "Which fieldset do you wish to control? ",
            choices: tm.fieldsets.map((d) => d.name),
        },
    ]);

    return tm.fieldsets.find(
        (set) => set.name === response.fieldset
    ) as Fieldset;
};

export async function getOBSAssociations(fieldset: Fieldset, obs: ObsWebSocket | null) {

    if (!obs) {
        return null;
    }

    const fields = fieldset.fields;
    const scenes = await obs.send("GetSceneList");

    const associations: string[] = [];

    for (const field of fields) {
        const response = await inquirer.prompt([
            {
                name: "scene",
                type: "list",
                message: `What scene do you want to associate with ${field.name}? `,
                choices: scenes.scenes.map((s) => s.name),
            },
        ]);
        associations[field.id] = response.scene;
    };

    return associations;
};

export async function getATEMAssociations(fieldset: Fieldset, atem: ATEM | null) {

    if (!atem) {
        return null
    };

    const fields = fieldset.fields;
    const scenes = Object.entries(atem.state.channels).map(([number, value]) => ({ name: value.label, value: +number }));

    const associations: number[] = [];

    for (const field of fields) {
        const response = await inquirer.prompt([
            {
                name: "scene",
                type: "list",
                message: `What channel do you want to associate with ${field.name}? `,
                choices: scenes
            },
        ]);
        associations[field.id] = response.scene;
    };

    return associations;
};



export async function getAudienceDisplayOptions() {

    type Choices = "queueIntro" | "preventSwitch" | "savedScore" | "rankings";
    const choices: { name: string; value: Choices }[] = [
        { name: "Show intro upon match queue", value: "queueIntro" },
        { name: "Prevent switching display mode in-match", value: "preventSwitch" },
        { name: "Show saved score 3 seconds after match", value: "savedScore" },
        { name: "Flash rankings 3 seconds after every 6th match", value: "rankings" }
    ];

    const response: { options: Choices[] } = await inquirer.prompt([
        {
            name: "options",
            type: "checkbox",
            message: "Which audience display automation would you like to enable?",
            choices
        }
    ]);

    const flags = Object.fromEntries(choices.map(ch => [ch.value, false])) as Record<Choices, boolean>;
    for (const option of response.options) {
        flags[option] = true;
    };

    return flags;
};

export async function getRecordingPath(obs: ObsWebSocket | null): Promise<fs.FileHandle | null> {

    if (!obs) {
        return null;
    };

    const response: { record: boolean } = await inquirer.prompt([
        {
            name: "record",
            type: "confirm",
            message: "Save a file with stream timestamps for each match?"
        }
    ]);

    if (response.record) {
        const directory = tmpdir();
        const path = join(directory, `tm_obs_switcher_${new Date().toISOString()}_times.csv`);

        console.log(`  Will save match stream times to ${path}`);
        let handle: fs.FileHandle;
        try {
            handle = await fs.open(path, "w");

            await handle.write("TIMESTAMP,OBS_TIME,MATCH,RED TEAMS, BLUE TEAMS\n");
            return handle
        } catch (e) {
            console.log("❌ Could not write to file: ", e);
            await keypress();
            process.exit(1);
        };

    } else {
        return null;
    }
};
