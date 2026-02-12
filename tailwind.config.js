/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E405C9',
        secondary: '#00B8FF',
        dark: '#212121',
        header: '#2F2F2F',
      },
    },
  },
  plugins: [],
}
