import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        background: "var(--color-bg)",
        panel: "var(--color-panel)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
      },
      fontFamily: {
        sans: ["Roboto", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 30px rgba(0, 0, 0, 0.25)",
      },
      screens: {
        xs: "420px",
        sm: "575px",
        md: "768px",
        lg: "991px",
        xl: "1400px",
        "2xl": "1600px",
      },
    },
  },
  plugins: [typography],
};
