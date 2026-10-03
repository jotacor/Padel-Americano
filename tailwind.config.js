/** @type {import('tailwindcss').Config} */
export default {
  // Every file that may contain class names (no class names are built from pieces)
  content: ['./index.html', './*.tsx', './components/**/*.tsx', './hooks/**/*.ts', './utils/**/*.ts', './i18n/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        inter: ['"Inter Variable"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
