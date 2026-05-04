import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        bubbly: ['"Comic Sans MS"', '"Quicksand"', "system-ui", "sans-serif"],
      },
      animation: {
        "bounce-slow": "bounce 2.5s infinite",
        "wiggle": "wiggle 1s ease-in-out infinite",
        "pop": "pop 0.4s ease-out",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        pop: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
