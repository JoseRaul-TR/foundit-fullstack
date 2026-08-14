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
      keyframes: {
        // A halo that leaves the dot alone. Scaling the dot itself would make
        // the thing you're meant to read the thing that moves.
        halo: {
          "75%, 100%": { transform: "scale(2.6)", opacity: "0" },
        },
        // Grows outside the border, so the pill's own geometry never changes
        // and nothing around it reflows.
        "ring-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgb(var(--color-success) / 0.45)" },
          "70%": { boxShadow: "0 0 0 5px rgb(var(--color-success) / 0)" },
          "100%": { boxShadow: "0 0 0 0 rgb(var(--color-success) / 0)" },
        },
      },
      animation: {
        // Same duration for both, so the dot and the pills beat together
        // instead of drifting against each other. Three runs, 4.8s total:
        // under the five seconds past which WCAG 2.2.2 wants a pause control.
        halo: "halo 1.6s cubic-bezier(0,0,0.2,1) 3",
        "ring-pulse": "ring-pulse 1.6s ease-out 3",
      },
    },
  },
} satisfies Config;
