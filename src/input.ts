import inquirer from "inquirer";
import ObsWebSocket from "obs-websocket-js";
import Client from "vex-tm-client";
import { join } from "path";
import { promises as fs } from "fs";
import { cwd } from "process";
import Fieldset from "vex-tm-client/out/Fieldset";
import Division from "vex-tm-client/out/Division";
import { Atem } from "atem-connection";
import OBSWebSocket from "obs-websocket-js";

export async function getFieldset(tm: Client) {
    const response: { fieldset: string } = await inquirer.prompt([
        {
            name: "fieldset",
            type: "list",
            message: "Attach to which fieldset? ",
            choices: tm.fieldsets.map((d) => d.name),
        },
    ]);

    return tm.fieldsets.find(
        (set) => set.name === response.fieldset
    ) as Fieldset;
};

export async function getAssociations(fieldset: Fieldset, obs: ObsWebSocket | null, atem: Atem | null) {
    const fields = fieldset.fields;

    const scenes = await obs?.call("GetSceneList") ?? { scenes: [] };
    const associations: Record<string, { obs: string | undefined, atem: number | undefined }> = {};

    for (const [id, name] of Object.entries(fields)) {

        const questions = [];

        if (obs && scenes.scenes.length > 0) {
            questions.push(
                {
                    name: "obs",
                    type: "list",
                    message: `What OBS scene do you want to associate with ${name}? `,
                    choices: scenes.scenes.map((s) => s.sceneName),
                },
            );
        }

        if (atem && atem.state) {

            const inputs = Object.entries(atem.state?.inputs);
            questions.push(
                {
                    name: "atem",
                    type: "list",
                    message: `What ATEM input do you want to associate with ${name}? `,
                    choices: inputs.map(([value, input]) => ({ name: input?.shortName, value: Number.parseInt(value) }))
                }
            );
        }

        const response: { obs: string | undefined, atem: number | undefined } = await inquirer.prompt(questions);
        associations[id] = response;
    };

    return associations;
};

export async function getRecordingOptions(tm: Client, obs: OBSWebSocket | null) {

    let response = { recordIndividualMatches: false };
    if (obs) {
        response = await inquirer.prompt([
            {
                name: "recordIndividualMatches",
                type: "confirm",
                message: "Start and stop recording for each match? ",
                default: false
            }
        ]);
    }

    let division: Division = tm.divisions[0];
    if (tm.divisions.length > 1) {
        const response: { division: number } = await inquirer.prompt([
            {
                name: "division",
                type: "list",
                message: "Attach to which division? ",
                choices: tm.divisions.map(d => ({ name: d.name, value: d.id })),
                default: tm.divisions[0].id
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
