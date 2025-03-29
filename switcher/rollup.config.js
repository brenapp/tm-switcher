import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { typescriptPaths } from "rollup-plugin-typescript-paths";
import copy from "rollup-plugin-copy";

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
    // Copy prebuilt binaries
    copy({
      targets: [
        {
          src: "node_modules/@julusian/freetype2/prebuilds/**/*",
          dest: "./out/switcher/prebuilds",
        },
      ],
    }),
  ],
  output: {
    file: "../out/switcher/main.cjs",
    format: "commonjs",
  },
};
export default config;
