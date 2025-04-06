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
    injectProcessEnv({
      SECRET_VEXTM_CLIENT_ID: process.env.SECRET_VEXTM_CLIENT_ID,
      SECRET_VEXTM_CLIENT_SECRET: process.env.SECRET_VEXTM_CLIENT_SECRET,
      SECRET_VEXTM_GRANT_TYPE: process.env.SECRET_VEXTM_GRANT_TYPE,
      SECRET_VEXTM_EXPIRATION_DATE: process.env.SECRET_VEXTM_EXPIRATION_DATE,

      SECRET_LOGS_SERVER: process.env.SECRET_LOGS_SERVER,
      SECRET_LOGS_TOKEN: process.env.SECRET_LOGS_TOKEN,
    }),
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
