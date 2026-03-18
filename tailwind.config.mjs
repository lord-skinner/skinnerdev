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
  plugins: [
    typography,
    function ({ addBase }) {
      addBase({
        ".prose": {
          "--tw-prose-body": "var(--color-muted)",
          "--tw-prose-headings": "var(--color-text)",
          "--tw-prose-lead": "var(--color-muted)",
          "--tw-prose-links": "var(--color-primary)",
          "--tw-prose-bold": "var(--color-text)",
          "--tw-prose-counters": "var(--color-muted)",
          "--tw-prose-bullets": "var(--color-muted)",
          "--tw-prose-hr": "var(--color-border)",
          "--tw-prose-quotes": "var(--color-text)",
          "--tw-prose-quote-borders": "var(--color-primary)",
          "--tw-prose-captions": "var(--color-muted)",
          "--tw-prose-kbd": "var(--color-text)",
          "--tw-prose-code": "var(--color-text)",
          "--tw-prose-pre-code": "var(--color-text)",
          "--tw-prose-pre-bg": "var(--color-panel-soft)",
          "--tw-prose-th-borders": "var(--color-border)",
          "--tw-prose-td-borders": "var(--color-border)",
          "--tw-prose-invert-body": "var(--color-muted)",
          "--tw-prose-invert-headings": "var(--color-text)",
          "--tw-prose-invert-links": "var(--color-primary)",
          "--tw-prose-invert-bold": "var(--color-text)",
          "--tw-prose-invert-counters": "var(--color-muted)",
          "--tw-prose-invert-bullets": "var(--color-muted)",
          "--tw-prose-invert-hr": "var(--color-border)",
          "--tw-prose-invert-quotes": "var(--color-text)",
          "--tw-prose-invert-quote-borders": "var(--color-primary)",
          "--tw-prose-invert-captions": "var(--color-muted)",
          "--tw-prose-invert-kbd": "var(--color-text)",
          "--tw-prose-invert-code": "var(--color-text)",
          "--tw-prose-invert-pre-code": "var(--color-text)",
          "--tw-prose-invert-pre-bg": "var(--color-panel-soft)",
          "--tw-prose-invert-th-borders": "var(--color-border)",
          "--tw-prose-invert-td-borders": "var(--color-border)",
        },
      });
    },
  ],
};
