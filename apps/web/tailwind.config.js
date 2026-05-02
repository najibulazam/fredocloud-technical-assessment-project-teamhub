const sharedConfig = require("@team-hub/config/tailwind");

module.exports = {
  ...sharedConfig,
  darkMode: "class",
  theme: {
    ...(sharedConfig.theme || {}),
    extend: {
      ...(sharedConfig.theme?.extend || {}),
      colors: {
        ...(sharedConfig.theme?.extend?.colors || {}),
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        muted: "var(--color-muted)"
      }
    }
  },
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "../../packages/ui/src/**/*.{js,jsx}"
  ]
};
