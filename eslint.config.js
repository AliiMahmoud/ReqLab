// Lint rules = the code standards from the plan, enforced by the machine.
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const readabilityLimits = {
  "max-lines-per-function": ["error", { max: 30, skipBlankLines: true, skipComments: true }],
  "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
  "max-params": ["error", 3],
  "max-depth": ["error", 2],
  complexity: ["error", 8],
  "no-nested-ternary": "error",
  "prefer-const": "error",
  eqeqeq: ["error", "always"],
};

const securityBans = {
  "no-eval": "error",
  "no-implied-eval": "error",
  "no-new-func": "error",
  "no-script-url": "error",
  "no-restricted-properties": [
    "error",
    { object: "Math", property: "random", message: "Use node:crypto randomBytes/randomUUID." },
    { object: "document", property: "write", message: "Never write raw HTML." },
  ],
  "no-restricted-syntax": [
    "error",
    {
      selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]",
      message: "Never assign raw HTML. Use Lit templates.",
    },
    {
      selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
      message: "Never insert raw HTML. Use Lit templates.",
    },
    {
      selector:
        "CallExpression[callee.property.name=/^(exec|prepare|pragma)$/] > TemplateLiteral[expressions.length>0]",
      message: "Never build SQL from template strings. Use ? parameters.",
    },
  ],
};

const typeSafety = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/consistent-type-imports": "error",
  "@typescript-eslint/explicit-module-boundary-types": "error",
  "@typescript-eslint/no-floating-promises": "error",
};

/** The production CSP blocks inline style attributes (and Lit's styleMap writes one on first render). */
const rendererStyleRule = {
  "no-restricted-syntax": [
    "error",
    ...securityBans["no-restricted-syntax"].slice(1),
    {
      selector: "ImportDeclaration[source.value='lit/directives/style-map.js']",
      message: "styleMap writes a style attribute on first render, which the CSP blocks. Use safeStyle.",
    },
    {
      selector: "TaggedTemplateExpression[tag.name='html'] TemplateElement[value.raw=/\\sstyle=[\"']/]",
      message:
        "Inline style attributes are blocked by the CSP. Use safeStyle (renderer/directives/safe-style.ts).",
    },
  ],
};

const rendererBoundaries = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        { group: ["electron", "node:*"], message: "The renderer never touches Electron or Node." },
        {
          group: ["**/main/**", "**/preload/**"],
          message: "The renderer talks to main only via window.reqlab.",
        },
        { group: ["lit/directives/unsafe-*"], message: "unsafeHTML/unsafeSVG are banned." },
      ],
    },
  ],
};

const sharedBoundaries = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        { group: ["electron", "node:*"], message: "shared/ is pure: no Electron, no Node." },
        {
          group: ["**/main/**", "**/preload/**", "**/renderer/**"],
          message: "shared/ imports nothing app-specific.",
        },
      ],
    },
  ],
};

const mainBoundaries = {
  "no-console": "error",
  "no-restricted-imports": [
    "error",
    { patterns: [{ group: ["**/renderer/**"], message: "main never imports UI code." }] },
  ],
};

export default tseslint.config(
  { ignores: ["out/**", "release/**", "node_modules/**", "scripts/**", "*.config.*"] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: { ...readabilityLimits, ...securityBans, ...typeSafety },
  },
  {
    files: ["src/renderer/**/*.ts"],
    rules: {
      ...rendererBoundaries,
      ...rendererStyleRule,
      // shared/models/* use zod; a value import would pull it (and its eval probe) into the UI bundle.
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@shared/models/*"],
              allowTypeImports: true,
              message:
                "The UI may only `import type` from shared/models. Put runtime values in a zod-free shared file.",
            },
          ],
        },
      ],
    },
  },
  { files: ["src/shared/**/*.ts"], rules: sharedBoundaries },
  { files: ["src/main/**/*.ts"], rules: mainBoundaries },
  // The logger is the one place in main allowed to write to the console streams.
  { files: ["src/main/logging/logger.ts"], rules: { "no-console": "off" } },
);
