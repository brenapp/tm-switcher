import inquirer from "inquirer";
import ObsWebSocket from "obs-websocket-js";
import Client from "vex-tm-client";
import { join } from "path";
import { promises as fs } from "fs";
import { cwd } from "process";
import Fieldset from "vex-tm-client/out/Fieldset";
import Division from "vex-tm-client/out/Division";

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

export async function getAssociations(fieldset: Fieldset, obs: ObsWebSocket) {
    const fields = fieldset.fields;
    const scenes = await obs.call("GetSceneList");

    const associations: string[] = [];

    for (const field of fields) {
        const response = await inquirer.prompt([
            {
                name: "scene",
                type: "list",
                message: `What scene do you want to associate with ${field.name}? `,
                choices: scenes.scenes.map((s) => s.sceneName),
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

export async function getRecordingOptions(tm: Client) {

    const response: { recordIndividualMatches: boolean } = await inquirer.prompt([
        {
            name: "recordIndividualMatches",
            type: "confirm",
            message: "Start and stop recording for each match? "
        }
    ]);

    let division: Division = tm.divisions[0];
    if (tm.divisions.length > 1) {
        const response: { division: number } = await inquirer.prompt([
            {
                name: "division",
                type: "list",
                message: "Which division do you wish to record? ",
                choices: tm.divisions.map(d => ({ name: d.name, value: d.id }))
            },
        ]);

        division = tm.divisions.find(d => d.id === response.division) as Division;
    };

    const directory = cwd();

    const date = new Date();
    const path = join(directory, `tm_obs_switcher_${date.getDate()}_${date.getMonth() + 1}_${date.getFullYear()}_times.csv`);

    console.log(`  Will save match stream times to ${path}`);
    const handle = await fs.open(path, "a");

    const stat = await handle.stat();

    if (stat.size > 0) {
        console.log(`  File already exists, will append new entries...`);
    } else {
        handle.write("TIMESTAMP,OBS_TIME,MATCH\n");
    }

    return { handle, division, ...response }
};
