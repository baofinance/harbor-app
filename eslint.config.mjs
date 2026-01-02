import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "*.config.mjs",
      "scripts/**",
      "check-*.js",
      "debug-*.js",
      "*.js",
      "next-env.d.ts",
      "subgraph/**",
      "cache/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
