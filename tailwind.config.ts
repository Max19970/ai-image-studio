import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        glass: '0 28px 90px rgba(3, 6, 18, .46)',
        glow: '0 0 0 1px rgba(255,255,255,.08), 0 24px 60px rgba(76, 132, 255, .12)',
        card: '0 22px 50px rgba(0,0,0,.32)'
      },
      backgroundImage: {
        hero: 'radial-gradient(circle at 20% 0%, rgba(111,156,255,.20), transparent 34%), radial-gradient(circle at 100% 14%, rgba(228,183,116,.13), transparent 28%), linear-gradient(145deg, #080b14 0%, #0d1320 45%, #0a0c10 100%)'
      }
    }
  },
  plugins: []
} satisfies Config;
