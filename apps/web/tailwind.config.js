import tailwindAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          node: 'var(--bg-node)',
          'node-solid': 'var(--bg-node-solid)',
          sidebar: 'var(--bg-sidebar)',
          pre: 'var(--bg-pre)',
          badge: 'var(--bg-badge)',
          legend: 'var(--bg-legend)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          subtle: 'var(--border-subtle)',
        },
        service: 'var(--color-service)',
        gateway: 'var(--color-gateway)',
        database: 'var(--color-database)',
        external: 'var(--color-external)',
        frontend: 'var(--color-frontend)',
        contract: 'var(--color-contract)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [
    tailwindAnimate,
  ],
}
