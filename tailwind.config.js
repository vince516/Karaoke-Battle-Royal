/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens — extracted verbatim from the prototype (index.html)
        ink: '#0E0E10',
        panel: '#17171A',
        panel2: '#1F1F23',
        line: '#2C2C31',
        red: '#E10A17', // Virgin red — LIVE / primary
        gold: '#FFB300', // points / prize / hype mid-tier
        mint: '#17E8A0', // on-tone / positive
        splat: '#FF5330', // tomato / off-tone
        bloom: '#FF7AA8', // flowers
        txt: '#EFEFF1',
        mut: '#ADADB8',
        dim: '#77777F',
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        ui: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
