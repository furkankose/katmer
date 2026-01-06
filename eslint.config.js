import pluginVue from "eslint-plugin-vue"
import {
  defineConfigWithVueTs,
  vueTsConfigs
} from "@vue/eslint-config-typescript"
import oxlint from "eslint-plugin-oxlint"
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting"

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"]
  },
  {
    name: "app/files-to-ignore",
    ignores: [
      "**/*.astro",
      "**/dist/**",
      "libs/@elysiajs/**",
      "**/dist-ssr/**",
      "**/coverage/**",
      "out/**",
      "test/**",
      "*.md",
      "**/*.d.ts",
      "**/*.min.js"
    ]
  },
  ...pluginVue.configs["flat/essential"],
  vueTsConfigs.recommended,
  oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
  skipFormatting,
  {
    files: ["**/*.{js,ts,mts,tsx,vue}"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "vue/multi-word-component-names": "off",
      "no-unused-vars": "off",
      "prefer-const": [
        "error",
        {
          destructuring: "all"
        }
      ],
      "no-useless-fallback-in-spread": "off",
      "@typescript-eslint/no-namespace": "off",
      "vue/attributes-order": "error",
      "vue/block-order": "error",
      "vue/no-lone-template": "error",
      "vue/html-self-closing": [
        "error",
        {
          html: { normal: "always", void: "any" }
        }
      ],
      "vue/block-lang": "off",
      "vue/valid-v-slot": "off",
      "vue/valid-v-for": "off",
      "vue/require-v-for-key": "off",
      "vue/no-mutating-props": "off",
      "vue/no-v-text-v-html-on-component": "off"
    }
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  {
    files: ["docs/**/*"],
    rules: {
      "no-unused-private-class-members": "off",
      "vue/no-deprecated-slot-attribute": "off"
    }
  }
)
