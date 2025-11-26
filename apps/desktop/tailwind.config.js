/** @type {import('tailwindcss').Config} */
export default {
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
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
            }
        },
    },
    plugins: [],
}
