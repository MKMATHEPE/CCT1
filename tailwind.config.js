/** @type {import("tailwindcss").Config} */
module.exports = {
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
        danger: "#DC2626",
        warning: "#F59E0B",
        success: "#16A34A",
        muted: "#6B7280",
      },
    },
  },
  plugins: [],
};
