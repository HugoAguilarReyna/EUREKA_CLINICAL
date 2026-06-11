/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eureka: {
          dark: '#0f172a',
          card: 'rgba(30, 41, 59, 0.7)',
          accent: '#3b82f6',
          glow: '#60a5fa'
        }
      }
    },
  },
  plugins: [],
}
