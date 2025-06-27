/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      animation: {
        fall: 'fall linear infinite',
      },
      keyframes: {
        fall: {
          '0%': { transform: 'translateY(0)', opacity: '0' },
          '10%': { opacity: '0.3' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};