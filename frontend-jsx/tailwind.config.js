/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#FAF8F3',
        'bg-2':  '#F3EFE5',
        'bg-3':  '#EBE5D3',
        ink:     '#0F1419',
        'ink-2': '#3D4751',
        'ink-3': '#6B7480',
        line:    '#E5DFD0',
        'line-2':'#D8D0BC',
        accent:  '#B8501C',
        'accent-2':'#7A2E0E',
        gold:    '#E8C76A',
        ok:      '#1B5E20',
        'ok-bg': '#E7F2E9',
        no:      '#880E4F',
        'no-bg': '#FCE4EC',
        warn:    '#8A5A00',
        'warn-bg':'#FFF4D9',
      },
      fontFamily: {
        serif:  ['Fraunces', 'serif'],
        sans:   ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:   ['"JetBrains Mono"', 'monospace'],
        deva:   ['"Noto Sans Devanagari"', 'serif'],
      },
    },
  },
  plugins: [],
}
