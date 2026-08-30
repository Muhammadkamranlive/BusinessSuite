import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./modules/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  blocklist: ["[-:TZ.]"],
  theme: {
    extend: {
      colors: {
        ink: "var(--bs-ink)",
        cloud: "var(--bs-cloud)",
        line: "var(--bs-line)",
        teal: {
          DEFAULT: "var(--bs-teal)",
          50: "color-mix(in srgb, var(--bs-teal) 12%, white)",
          100: "color-mix(in srgb, var(--bs-teal) 20%, white)",
          200: "color-mix(in srgb, var(--bs-teal) 38%, white)"
        },
        coral: "var(--bs-coral)",
        amber: "var(--bs-amber)",
        mint: "var(--bs-mint)"
      },
      boxShadow: {
        soft: "var(--bs-card-shadow)"
      },
      borderRadius: {
        DEFAULT: "var(--bs-radius)"
      }
    }
  },
  plugins: []
};

export default config;
