import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#FBFBF7",
        panel: "#FFFFFF",
        panel2: "#F1EFE6",
        paper: "#15140F",
        muted: "#6B6862",
        line: "#D9D4C5",
        signal: "#D7263D",
        signaldim: "#E8A5AC",
        steady: "#1B4B91",
        amber: "#B98A00",
        hazard: "#FFC400",
        steel: "#2E3236",
      },
      fontFamily: {
        display: ["'Archivo Black'", "'Arial Black'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;