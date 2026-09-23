import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import prettierConfig from "eslint-config-prettier";

const isLocal = process.env.NODE_ENV === "development";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "**/*.d.ts",
      "eslint.config.mjs",
      ".eslintrc.js",
      "package.json",
      "crypto.ts",
      "drizzle.config.ts",
      "commitlint.config.js",
      "dangerfile.js",
      "spell-check.js",
      "src/migrations",
      "cspell.js",
      "danger.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      import: importPlugin,
      "unused-imports": unusedImports,
    },
    rules: {
      "import/newline-after-import": ["error"],
      "import/extensions": "off",
      "import/prefer-default-export": "off",
      "import/no-extraneous-dependencies": "off",
      "@typescript-eslint/no-explicit-any": isLocal ? "warn" : "error",
      "@typescript-eslint/no-shadow": "warn",
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/no-loop-func": "warn",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-empty-interface": "error",
      "@typescript-eslint/no-use-before-define": "warn",
      "import/order": [
        "error",
        {
          pathGroups: [
            {
              pattern: "~/**",
              group: "external",
              position: "after",
            },
          ],
          groups: [
            "external",
            "internal",
            "unknown",
            "index",
            "object",
            "type",
            "builtin",
            "sibling",
            "parent",
          ],
        },
      ],
      "no-console": "error",
      "no-var": "error",
      "no-nested-ternary": "warn",
      "no-unneeded-ternary": "warn",
      "no-empty-pattern": "error",
      "no-restricted-exports": "off",
      "object-shorthand": "error",
      "prefer-destructuring": "warn",
      // camelcase: "warn",
      "max-params": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: false,
        },
      ],
    },
  }
);
