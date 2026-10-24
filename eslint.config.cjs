const { createRequire } = require("node:module");
const web = createRequire(
  require("node:path").join(__dirname, "apps/web/package.json"),
);
const next = createRequire(web.resolve("eslint-config-next"));
const js = next("@eslint/js");
module.exports = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/next-env.d.ts",
    ],
    linterOptions: { reportUnusedDisableDirectives: false },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: next("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@next/next": next("@next/eslint-plugin-next"),
      "react-hooks": next("eslint-plugin-react-hooks"),
      "@typescript-eslint": next("@typescript-eslint/eslint-plugin"),
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-useless-escape": "off",
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
