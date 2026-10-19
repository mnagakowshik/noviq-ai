import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          DEFAULT: "#101522",
          50: "#1E2538",
          100: "#192030",
          200: "#141B2B",
          300: "#101522",
        },
        surface: {
          dark: "#20283A",
          darkElevated: "#283248",
          light: "#FFFFFF",
          lightElevated: "#EEF1F6",
        },
        violetPrimary: {
          DEFAULT: "#8B7CFF",
          hover: "#7867FB",
          muted: "rgba(139, 124, 255, 0.15)",
        },
        lightBg: {
          DEFAULT: "#F5F6FA",
          subtle: "#EBEFF5",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
