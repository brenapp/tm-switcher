import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { typescriptPaths } from "rollup-plugin-typescript-paths";


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
  },
};
export default config;
