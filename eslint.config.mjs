import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([

    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    "scratch/**",
    "scripts/**",
  ]),
  {

    rules: {

      "@typescript-eslint/no-explicit-any": "warn",

      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_|^error$|^err$|^e$",
      }],

      "@typescript-eslint/no-empty-object-type": "off",

      "react/no-unescaped-entities": "off",

      "react-hooks/set-state-in-effect": "warn",

      "react-hooks/static-components": "warn",

      "react-hooks/immutability": "warn",

      "react-hooks/purity": "warn",

      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
