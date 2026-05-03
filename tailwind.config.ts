import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F6F8FB",
        card: "#FFFFFF",
        border: "#E5E9F0",
        primary: "#2563EB",
        muted: "#6B7280",
      },
    },
  },
  plugins: [],
} satisfies Config;