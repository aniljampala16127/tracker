import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F0F7F2",
          100: "#D4E8DC",
          200: "#A8D1B8",
          300: "#74B08A",
          400: "#4A9468",
          500: "#2D6A4F",
          600: "#245740",
          700: "#1B4331",
          800: "#133022",
          900: "#0A1D14",
        },
        sand: {
          50: "#FAFAF8",
          100: "#F2F1ED",
          200: "#E8E6E1",
          300: "#D5D3CE",
          400: "#B0ADA6",
          500: "#8A8880",
          600: "#65635D",
          700: "#43423E",
          800: "#2B2A27",
          900: "#1A1A18",
        },
        warn: {
          light: "#FDF3DC",
          DEFAULT: "#D4A03C",
          dark: "#9B7420",
        },
        error: {
          light: "#FCEAE7",
          DEFAULT: "#C05746",
          dark: "#8B3D30",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "Helvetica Neue", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
