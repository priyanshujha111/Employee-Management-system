/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        brand: {
          900: "#1E1B4B",
          700: "#3730A3",
          600: "#4F46E5",
          500: "#6366F1",
        },
        accent: {
          500: "#14B8A6",
        },
      },
    },
  },
  plugins: [],
};