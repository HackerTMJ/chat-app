import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      // Custom transitions for theme switching
      transitionProperty: {
        'theme': 'background-color, border-color, color, fill, stroke',
      },
      transitionDuration: {
        'theme': '200ms',
      },
      transitionTimingFunction: {
        'theme': 'ease-in-out',
      },
    },
  },
  plugins: [],
}

export default config