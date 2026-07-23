import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/components/**/*.{vue,js,ts}",
    "./app/layouts/**/*.vue",
    "./app/pages/**/*.vue",
    "./app/app.vue",
  ],
  theme: {
    extend: {
      colors: {
        page: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        border: "var(--color-border)",
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        brand: "var(--color-accent-gold)",
        accent: "var(--color-accent-blue)",
        success: "var(--color-success)",
        error: "var(--color-error)",
      },
      maxWidth: {
        container: "1280px",
      },
    },
  },
} satisfies Config;
