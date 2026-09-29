import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'portal-dark': '#0F2530',
        'portal-dark-light': '#173D49',
        'portal-orange': '#F7941D',
        'portal-orange-dark': '#DF7C08',
        'career-blue': '#2563EB',
        'talent-teal': '#0EA5A8',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
