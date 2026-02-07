/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#13ec5b",
                "primary-dark": "#10d652",
                "background-light": "#f6f8f6",
                "background-dark": "#102216",
                "card-light": "#ffffff",
                "card-dark": "#1c3326",
                "surface-light": "#ffffff",
                "surface-dark": "#1c2e22",
            },
            fontFamily: {
                "display": ["Lexend", "sans-serif"],
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "full": "9999px"
            },
        },
    },
    plugins: [],
}
