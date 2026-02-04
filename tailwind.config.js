/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate950: "#020618",
        slate900: "#0F172B",
        slate800: "#1D293D",
        slate700: "#314158",
        slate200: "#E2E8F0",
        slate50: "#F8FAFC",
        orange500: "#FF6900",
        orange600: "#F54900",
        orange300: "#FFB86A",
        teal400: "#00D5BE",
        teal600: "#009689",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "glow-orange": "0 0 20px rgba(255, 105, 0, 0.3)",
        "glow-orange-lg": "0 0 40px rgba(255, 105, 0, 0.4)",
        "glow-teal": "0 0 20px rgba(0, 213, 190, 0.3)",
        "glow-teal-lg": "0 0 40px rgba(0, 213, 190, 0.4)",
        card: "0 4px 20px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.4)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
      },
    },
  },
  plugins: [],
};
