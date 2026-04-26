/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0D1B2A",
          800: "#132030",
          700: "#1E3A4A",
        },
        teal: {
          DEFAULT: "#00897B",
          light: "#4DB6AC",
        },
        amber: {
          DEFAULT: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
