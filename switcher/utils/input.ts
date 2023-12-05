import inquirer, { DistinctQuestion, QuestionCollection } from "inquirer";
import ObsWebSocket from "obs-websocket-js";
import { Client, Division, Fieldset } from "vex-tm-client";
import { join } from "path";
import { promises as fs } from "fs";
import { cwd } from "process";
import { Atem } from "atem-connection";
import OBSWebSocket from "obs-websocket-js";
import { keypress } from "./authenticate";
import { tmpdir, networkInterfaces } from "os";
import { log } from "./logging";

export type TournamentAttachments = {
    fieldset: Fieldset,
    division: Division,
}

export async function getTournamentAttachments(tm: Client): Promise<TournamentAttachments> {

    const fieldsets = await tm.getFieldsets();
    if (!fieldsets.success) {

        log("error", `❌ Tournament Manager: Could not fetch fieldsets ${fieldsets.error}`);
        log("error", `${fieldsets.error_details}`);

        await keypress();
        process.exit(1);
    }

    let fieldset = fieldsets.data[0];

    if (fieldsets.data.length > 1) {
        const response: { fieldset: number } = await inquirer.prompt([
            {
                name: "fieldset",
                type: "list",
                message: "Attach to which fieldset? ",
                choices: fieldsets.data.map((d) => ({ name: d.name, value: d.id })),
            },
        ]);

        fieldset = fieldsets.data.find((d) => d.id === response.fieldset) as Fieldset;
    };

    const result = await fieldset.connect();
    if (!result.success) {

        log("error", `❌ Tournament Manager: Could not connect to Fieldset ${result.error}`);
        log("error", `${result.error_details}`);

        await keypress();
        process.exit(1);
    }

    const divisions = await tm.getDivisions();
    if (!divisions.success) {

        log("error", `❌ Tournament Manager: Could not fetch divisions ${divisions.error}`);
        log("error", `${divisions.error_details}`);

        await keypress();
        process.exit(1);
    }

    let division = divisions.data[0];

    if (divisions.data.length > 1) {
        const response: { division: number } = await inquirer.prompt([
            {
                name: "division",
                type: "list",
                message: "Attach to which division? ",
                choices: divisions.data.map(d => ({ name: d.name, value: d.id })),
                default: division.id
            },
        ]);

        division = divisions.data.find(d => d.id === response.division) as Division;
    };

    return {
        fieldset, division
    }
};

export type FieldAssociation = {
    obs: string | undefined,
    atem: number | undefined
}

export type FieldAssociations = Record<string, FieldAssociation | undefined>;

export async function getAssociations(fieldset: Fieldset, obs: ObsWebSocket | null, atem: Atem | null): Promise<FieldAssociations> {
    const fields = await fieldset.getFields();
    if (!fields.success) {

        log("error", `❌ Tournament Manager: Could not fetch fields in fieldset ${fields.error}`);
        log("error", `${fields.error_details}`);

        await keypress();
        process.exit(1);
    }


    const scenes = await obs?.call("GetSceneList") ?? { scenes: [] };
    const associations: FieldAssociations = {};

    for (const field of fields.data) {
        const questions: DistinctQuestion[] = [];
        const initial: FieldAssociation = { obs: undefined, atem: undefined };

        if (obs && scenes.scenes.length > 0) {
            const defaultValue = scenes.scenes.find(s => `${s.sceneName}`.toLowerCase() === field.name.toLowerCase())?.sceneName as string | undefined;
            questions.push(
                {
                    name: "obs",
                    type: "list",
                    message: `What OBS scene do you want to associate with ${field.name}? `,
                    choices: scenes.scenes.map((s) => s.sceneName as string),
                    default: defaultValue
                },
            );
        }

        if (atem && atem.state) {

            const inputs = Object.entries(atem.state?.inputs);
            const defaultValue = Number.parseInt(inputs.find(([value, input]) => input?.shortName.toLowerCase() === field.name.toLowerCase())?.[0] ?? "NaN");
            questions.push(
                {
                    name: "atem",
                    type: "list",
                    message: `What ATEM input do you want to associate with ${field.name}? `,
                    choices: inputs.map(([value, input]) => ({ name: input?.shortName, value: Number.parseInt(value) })),
                    default: isNaN(defaultValue) ? undefined : defaultValue
                }
            );
        }

        const response = await inquirer.prompt<FieldAssociation>(questions);
        associations[field.id] = response;
    };

    return associations;
};

export type RecordingOptions = {
    recordIndividualMatches: boolean,
};

export async function getRecordingOptions(obs: OBSWebSocket | null): Promise<RecordingOptions> {

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

    return response;
};

export type AudienceDisplayOptions = {
    queueIntro: boolean,
    savedScore: boolean,
    flashRankings: boolean
}


export async function getAudienceDisplayOptions(): Promise<AudienceDisplayOptions> {

    const choices = [
        { name: "Show intro upon field activation", value: "queueIntro" },
        { name: "Show saved score after match", value: "savedScore" },
        { name: "Show rankings after every 6th match", value: "flashRankings" }
    ] as const;

    const response: { options: (keyof AudienceDisplayOptions)[] } = await inquirer.prompt([
        {
            name: "options",
            type: "checkbox",
            message: "Which audience display automation would you like to enable?",
            choices
        }
    ]);

    const flags = Object.fromEntries(choices.map(ch => [ch.value, false])) as AudienceDisplayOptions;
    for (const option of response.options) {
        flags[option] = true;
    };

    return flags;
};

export type FileHandles = {
    timestamp: fs.FileHandle;
    log: fs.FileHandle;

    logPath: string;
    timestampPath: string;
}

export async function getFileHandles(): Promise<FileHandles> {

    const directory = cwd();

    const date = new Date().toISOString().split("T")[0];
    const timestampPath = join(directory, `tm_switcher_${date}_times.csv`);

    const timestamp = await fs.open(timestampPath, "a");
    const stat = await timestamp.stat();

    if (stat.size < 1) {
        timestamp.write("TIMESTAMP,OBS_TIME,MATCH,TEAMS\n");
    }

    const logPath = join(tmpdir(), `tm_switcher_${date}_log.txt`);
    const log = await fs.open(logPath, "a");

    await log.write(`\n\ntm-switcher v${require("../../../package.json").version} started at ${new Date().toISOString()}\n`);
    await log.write(`OS:  ${process.platform} ${process.arch}\n`);
    await log.write(`Node Version:  ${process.version}\n`);
    await log.write(`Directory:  ${directory}\n`);

    await log.write(`Network Interfaces: \n`);
    const ifaces = networkInterfaces()
    for (const [name, iface] of Object.entries(ifaces)) {
        await log.write(`  ${name}: ${iface?.map(i => i.address).join(", ")}\n`);
    }

    return { timestamp, log, logPath, timestampPath }
};