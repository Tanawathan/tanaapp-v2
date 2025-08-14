import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['var(--font-vt323)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        pixel: {
          ink: '#1f1f1f',
          bg: '#fcf7e8',
          surface: '#fffaf0',
          accent: '#5a5af7',
          peach: '#ffb07c',
          mint: '#8be9c7',
          lemon: '#ffe082',
          danger: '#ff6b6b'
        }
      },
      boxShadow: {
        pixel: '2px 2px 0 0 #000000',
        pixelMd: '3px 3px 0 0 #000000',
        pixelLg: '4px 4px 0 0 #000000'
      },
      borderWidth: {
        3: '3px'
      },
      borderRadius: {
        none: '0'
      }
    },
  },
  plugins: [],
} satisfies Config
