/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        fall: 'fall linear infinite',
        slide: 'slide 8s linear infinite',
      },
      keyframes: {
        fall: {
          '0%': { transform: 'translateY(0)', opacity: '0' },
          '10%': { opacity: '0.3' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        slide: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}