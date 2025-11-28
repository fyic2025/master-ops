/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          boo: '#4CAF50',      // Buy Organics Online - Green
          teelixir: '#9C27B0', // Teelixir - Purple (mushrooms)
          elevate: '#2196F3',  // Elevate Wholesale - Blue
          rhf: '#FF5722',      // Red Hill Fresh - Orange/Red
          brandco: '#F59E0B',  // Brand Connections - Amber
        }
      }
    },
  },
  plugins: [],
}
