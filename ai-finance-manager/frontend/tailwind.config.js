/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#080B12",
          900: "#0B0F17",
          800: "#111826",
          700: "#1A2333",
          600: "#28334A",
        },
        mist: {
          100: "#F4F6FB",
          200: "#DCE2EE",
          300: "#AEB9CE",
          400: "#7C89A3",
        },
        pulse: {
          DEFAULT: "#2DD4BF",
          soft: "#5EEAD4",
          dim: "#0F766E",
        },
        gold: {
          DEFAULT: "#F5B14C",
          soft: "#FBD38D",
        },
        coral: {
          DEFAULT: "#FB7185",
          soft: "#FDA4AF",
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.36)",
        glow: "0 0 24px 0 rgba(45, 212, 191, 0.35)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 20% 0%, rgba(45,212,191,0.08), transparent 45%), radial-gradient(circle at 80% 100%, rgba(245,177,76,0.06), transparent 45%)",
      },
      keyframes: {
        pulseline: {
          "0%, 100%": { opacity: 0.5 },
          "50%": { opacity: 1 },
        },
      },
      animation: {
        pulseline: "pulseline 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
