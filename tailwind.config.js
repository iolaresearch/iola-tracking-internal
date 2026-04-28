/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg:     "#07090D",
        s1:     "#0C1117",
        s2:     "#111820",
        s3:     "#16212C",
        accent: "#0ECDB7",
        amber:  "#F5A623",
        // keep legacy names for any remaining tailwind usage
        navy: { DEFAULT: "#07090D", 800: "#0C1117", 700: "#16212C" },
        teal: { DEFAULT: "#0ECDB7", light: "#1ADCC9" },
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
