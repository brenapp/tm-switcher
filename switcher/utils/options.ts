import Ajv, { JSONSchemaType } from "ajv";
import { SwitcherOptions } from "../behavior.js";
import { readFile, writeFile } from "node:fs/promises";
import { Client } from "vex-tm-client";

import * as schema from "~data:schema/config.schema.json" assert { type: "json" };

const ajv = new Ajv();

export type SwitcherConfigFile = Omit<SwitcherOptions, "attachments"> & {
    attachments: {
        fieldset: number;
        division: number;
    };
};

export function serializeOptions(options: SwitcherOptions): SwitcherConfigFile {
    return { ...options, attachments: { fieldset: options.attachments.fieldset.id, division: options.attachments.division.id } };
};

export async function deserializeOptions(tm: Client, options: SwitcherConfigFile | null): Promise<SwitcherOptions | null> {
    if (!options) {
        return null;
    }
    
    const fieldsets = await tm.getFieldsets();
    const divisions = await tm.getDivisions();

    if (!fieldsets.success || !divisions.success) {
        return null;
    }

    const fieldset = fieldsets.data.find((f) => f.id === options.attachments.fieldset);
    const division = divisions.data.find((d) => d.id === options.attachments.division);

    if (!fieldset || !division) {
        return null;
    }

    return { ...options, attachments: { fieldset, division } };
}
 


// Technically, we are ignoring if there is a divergence between the schema and
// the type, but typescript does not properly account for importing JSON "as
// const"

// @ts-expect-error - https://github.com/microsoft/TypeScript/issues/32063
export const validateSwitcherOptions = ajv.compile<SwitcherConfigFile>(schema satisfies JSONSchemaType<SwitcherConfigFile>);

export async function saveOptions(path: string, options: SwitcherOptions): Promise<void> {
    return writeFile(path, JSON.stringify({ $schema: schema.$id, ...serializeOptions(options) }, null, 2));
};

export async function getOptions(path: string): Promise<SwitcherConfigFile | null> {
    try {
        const data = await readFile(path, "utf-8");
        const options = JSON.parse(data);

        if (!validateSwitcherOptions(options)) {
            return null;
        }

        return options;
    } catch {
        return null;
    }
};