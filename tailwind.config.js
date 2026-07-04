/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#1e1e2e',
        surface: '#313244',
        overlay: '#45475a',
        text: '#cdd6f4',
        subtext: '#a6adc8',
        accent: '#89b4fa',
        green: '#a6e3a1',
        red: '#f38ba8',
        yellow: '#f9e2af',
      }
    }
  },
  plugins: []
}
