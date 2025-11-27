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
                    bg: '#FBF7EF',          // Main Paper Background (Warmer Cream)
                    sidebar: '#F2EBE0',     // Sidebars (Slightly darker cream)
                    panel: '#FCFBF7',       // Inner panels/cards

                    // ACCENTS
                    accent: '#D99A25',      // Honey Amber (Primary)
                    accentHover: '#B47F1E',
                    accentDim: 'rgba(217, 154, 37, 0.1)',

                    // TEXT
                    text: '#3E3832',        // Soft Black/Coffee
                    muted: '#8C857B',       // Warm Grey
                    border: '#E6E0D1',      // Stone Border

                    // STATUS
                    success: '#6A8F5D',     // Sage Green
                    error: '#C85C5C',       // Muted Red
                    warning: '#D99A25',

                    // SPECIFIC UI
                    selection: '#FCEEB5',
                    lineHighlight: '#F4F0E6',
                    textOnAccent: '#FFFFFF', // Added for contrast on accent buttons
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
                'paper': '0 2px 8px rgba(62, 56, 50, 0.06)',
                'float': '0 12px 24px -6px rgba(62, 56, 50, 0.12)',
                'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
            }
        },
    },
    plugins: [],
}
