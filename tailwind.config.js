/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'roam-navy': '#1C1C28',
        'roam-cyan': '#1EC1CB',
        'roam-navy-glass': 'rgba(28, 28, 40, 0.75)',
      },
      boxShadow: {
        'cyan-glow': '0 0 25px -5px rgba(30, 193, 203, 0.3)',
        'cyan-glow-lg': '0 0 35px -5px rgba(30, 193, 203, 0.5)',
      },
    },
  },
  plugins: [],
};
