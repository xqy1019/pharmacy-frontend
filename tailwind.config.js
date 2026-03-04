/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        mist: '#f3f7fb',
        aqua: '#5eead4',
        teal: '#0f766e',
        coral: '#fb7185',
        gold: '#f59e0b'
      },
      boxShadow: {
        panel: '0 24px 60px rgba(15, 23, 42, 0.12)'
      },
      fontFamily: {
        sans: ['"Avenir Next"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        display: ['"DIN Alternate"', '"Avenir Next Condensed"', '"PingFang SC"', 'sans-serif']
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at 1px 1px, rgba(15, 118, 110, 0.18) 1px, transparent 0)'
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        rise: 'rise 700ms ease-out forwards'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        rise: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
};
