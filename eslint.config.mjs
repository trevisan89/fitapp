import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // This folder is a workspace root shared with other projects
    // (backend/, frontend/, mobile/, trevisan-studio/, ...). ESLint only
    // targets the FitApp source code (see the `lint` script in package.json).
    "**/node_modules/**",
    "__pycache__/**",
    ".playwright-mcp/**",
  ]),
]);

export default eslintConfig;
