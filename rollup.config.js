import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { typescriptPaths } from "rollup-plugin-typescript-paths";
import injectProcessEnv from "rollup-plugin-inject-process-env";

import "dotenv/config";

/**
 * @type {import('rollup').Plugin}
 **/
const generateDenoJson = {
  name: "generate-deno-json",
  apply: "build",
  async buildStart() {
    this.emitFile({
      type: "asset",
      fileName: "deno.json",
      source: JSON.stringify({}),
    });
  },
};

/**
 * @type {import('rollup').RollupOptions}
 */
const VARIABLES = [
  "TM_SWITCHER_LOG_SERVER",
  "TM_SWITCHER_LOG_TOKEN",
  "TM_SWITCHER_BROKER_SERVER",
  "TM_SWITCHER_BROKER_TOKEN",
];

const missingVars = VARIABLES.filter(
  (key) => !process.env[key] || process.env[key] === ""
);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
}

const config = {
  input: "./switcher/main.ts",
  plugins: [
    typescriptPaths(),
    typescript({
      outputToFilesystem: false,
    }),
    json({
      compact: true,
    }),
    resolve({
      preferBuiltins: true,
    }),
    commonjs({
      ignoreDynamicRequires: true,
    }),
    injectProcessEnv(
      Object.fromEntries(VARIABLES.map((key) => [key, process.env[key]]))
    ),
    /**
     * Emit an empty deno.json file as a sibling to the output bundle. This is
     * to prevent deno compile from guamlessly trying to include node_modules
     * and host/node_modules in the output bundle, tripling the size of the
     * binary.
     **/
    generateDenoJson,
  ],
  output: {
    file: "./out/switcher/main.cjs",
    format: "commonjs",
    inlineDynamicImports: true,
  },
};
export default config;
