// @ts-check
import { addIconSelectors } from "@iconify/tailwind"

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "config/schema.{js,ts}",
    "./ui/src/plugins/formkit/formkit.theme.ts",
    "./ui/**/*.{html,jsx,tsx,vue}",
    "./shared/**/*.{html,jsx,ts,tsx,vue}"
  ],
  safelist: [{ pattern: /btn-./ }],
  darkMode: ["selector", ".theme-dark"],

  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(var(--color-primary-500) / <alpha-value>)",
          50: "rgb(var(--color-primary-50) / <alpha-value>)",
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)",
          700: "rgb(var(--color-primary-700) / <alpha-value>)",
          800: "rgb(var(--color-primary-800) / <alpha-value>)",
          900: "rgb(var(--color-primary-900) / <alpha-value>)"
        }
      }
    }
  },
  plugins: [
    addIconSelectors({
      prefixes: ["ph", "devicon"],
      maskSelector: ".ic-mask",
      backgroundSelector: ".ic-color",
      iconSelector: ".i-{prefix}-{name}",
      varName: "svg",
      scale: 0,
      square: true,
      extraMaskRules: {},
      extraBackgroundRules: {}
      // customise: (content, name, prefix) => content,
    })
  ]
}
