import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
        colors: {
          white: '#FFFFFF',
          'deep-navy': '#1c2e4a',
          'slate-blue': '#4a6c8c',
          'light-blue': '#cad6e4',
          'accent-orange': '#ed6c4c',
          'off-white': '#f9fbfc',
          navy: {
            DEFAULT: '#4A6C8C',
            dark: '#3A5570',
            darker: '#2C4259',
          },
          accent: {
            DEFAULT: '#FF751F',
            dark: '#E6601A',
            light: '#FFF0E8',
          },
          'blue-muted': '#95A7B5',
          'card-bg': '#CAD6E4',
          'card-border': '#B8C9D9',
          'page-bg': '#F4F7FA',
          success: {
            DEFAULT: '#2E7D52',
            light: '#E8F5EE',
          },
          error: {
            DEFAULT: '#C0392B',
            light: '#FDEDEC',
          },
        },
    },
  },
  plugins: [],
};

export default config;
