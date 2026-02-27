/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          light: '#f8f9fa',
          dark: '#1a1b1e',
        },
      },
    },
  },
  plugins: [],
}
