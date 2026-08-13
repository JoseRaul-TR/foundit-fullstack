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
        // Channels rather than hex, so `<alpha-value>` has something to fill
        // in. With a hex inside the variable Tailwind can't take it apart, so
        // every `/50` in the app was silently dropped — the header's blur, the
        // modal's scrim and the card markers were all fully opaque.
        page: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-elevated":
          "rgb(var(--color-surface-elevated) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        primary: "rgb(var(--color-text-primary) / <alpha-value>)",
        secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
        brand: "rgb(var(--color-accent-gold) / <alpha-value>)",
        accent: "rgb(var(--color-accent-blue) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
      },
      maxWidth: {
        container: "1280px",
      },
    },
  },
} satisfies Config;
