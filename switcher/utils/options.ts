import Ajv, { JSONSchemaType } from "ajv";
import { SwitcherOptions } from "../behavior.js";
import { writeFile } from "node:fs/promises";

import * as schema from "~data:schema/config.schema.json" assert { type: "json" };

const ajv = new Ajv();

// Technically, we are ignoring if there is a divergence between the schema and
// the type, but typescript does not properly account for importing JSON "as
// const"

// @ts-expect-error - https://github.com/microsoft/TypeScript/issues/32063
export const validateSwitcherOptions = ajv.compile<SwitcherOptions>(schema satisfies JSONSchemaType<SwitcherOptions>);

export async function saveOptions(path: string, options: SwitcherOptions): Promise<void> {
    return writeFile(path, JSON.stringify(options, null, 2));
};

export async function getOptions(path: string): Promise<SwitcherOptions | null> {
    return null;
};