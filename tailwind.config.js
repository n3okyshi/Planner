/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./**/*.{html,js}",
        "!./node_modules/**"
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--primary-color)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        }
    },
    plugins: [],
}