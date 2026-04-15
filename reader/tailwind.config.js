/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f0f13",
        card: "#1a1a24",
        brand: "#6366f1",
        fg: "#e2e8f0",
      },
    },
  },
  plugins: [],
};
