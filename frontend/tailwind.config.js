/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void:   '#07071a',      // deepest background (was #06080d)
        panel:  '#0e0e2c',      // card / panel background
        panel2: '#13133a',      // input / secondary panel
        edge:   '#252560',      // border colour
        volt:   '#a78bfa',      // PRIMARY accent — electric violet (was lime #baff29)
        cyan:   '#60a5fa',      // secondary accent — electric blue (was teal)
        amber:  '#fbbf24',      // warning / monthly — golden amber
        magenta:'#f472b6',      // error / alert — hot pink
        muted:  '#6b7280',      // muted text
      },
      fontFamily: {
        display: ['"Space Mono"', 'monospace'],
        body:    ['"IBM Plex Sans"', 'sans-serif'],
      },
      boxShadow: {
        glow:     '0 0 24px rgba(167,139,250,0.30)',   // violet glow
        cyanGlow: '0 0 24px rgba(96,165,250,0.28)',    // blue glow
      },
    },
  },
  plugins: [],
}
