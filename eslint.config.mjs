import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**", "build/**", "node_modules/**", "scripts/**", ".plasmo/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
        ecmaVersion: 2020,
        globals: {
            ...globals.browser,
            ...globals.node
        }
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
       ...reactPlugin.configs.recommended.rules,
       "react-hooks/rules-of-hooks": "error",
       "react-hooks/exhaustive-deps": "warn",
       "react/react-in-jsx-scope": "off",
       "react/prop-types": "off",
       "@typescript-eslint/no-unused-vars": ["warn", { 
         "argsIgnorePattern": "^_",
         "varsIgnorePattern": "^_",
         "caughtErrorsIgnorePattern": "^_"
       }],
       "@typescript-eslint/no-explicit-any": "warn"
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  prettierConfig
);
