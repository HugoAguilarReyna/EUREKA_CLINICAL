/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0F19', // Dark theme background inspired by Palantir
        surface: '#1A202C',
        surfaceHover: '#2D3748',
        node: {
          asset: '#3B82F6', // Blue
          case: '#10B981',  // Green
          governance: '#F59E0B', // Orange
          critical: '#EF4444', // Red
        }
      }
    },
  },
  plugins: [],
}
