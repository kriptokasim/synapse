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
                    bg: '#fbf7ef',         // Cream Background
                    sidebar: '#f7f2e8',    // Slightly darker cream
                    surface: '#ede6d4',    // Panel/Button surface
                    text: '#2b2926',       // Soft Charcoal
                    muted: '#8c877d',      // Muted text
                    accent: '#a39060',     // Olive/Gold Accent
                    border: '#e6dfd0',     // Subtle borders
                    selection: '#e3dcc8',  // Editor selection
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(163, 144, 96, 0.1)',
                'glow': '0 0 15px rgba(163, 144, 96, 0.3)',
            }
        },
    },
    plugins: [],
}
