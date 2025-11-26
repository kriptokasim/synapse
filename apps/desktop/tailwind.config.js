/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                aether: {
                    bg: '#FFFDF5',          // Warmer Cream (Paper-like)
                    sidebar: '#F4F0E6',     // Soft Beige (Distinct from main BG)

                    // HARMONIOUS AMBER (Rich Honey/Golden-Ochre)
                    // Less neon, more "Warm Minimal"
                    accent: '#D99A25',
                    accentHover: '#B47F1E',

                    textOnAccent: '#3E2C12', // Deep Brown (High contrast on Amber)

                    text: '#2D261F',        // Warm Charcoal
                    muted: '#8C857B',       // Warm Grey
                    border: '#E6E0D1',      // Soft Stone
                    selection: '#FCEEB5',   // Pale Amber
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            fontSize: {
                'xxs': '0.65rem',
            },
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.05)',
                'soft': '0 2px 10px rgba(217, 154, 37, 0.15)',
            }
        },
    },
    plugins: [],
}
