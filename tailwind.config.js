/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // 🎨 Palette de marque Izymoto : navy / mint / blanc
        // Aligne avec le logo v6 + l'affiche (fond bleu marine profond + accent vert mint)
        black: "#0A1A24", // alias global : `bg-black` rend en bleu marine de marque
        navy: {
          50: "#E9EFF2",
          100: "#C5D2D9",
          200: "#9CB2BD",
          300: "#7191A0",
          400: "#4E7384",
          500: "#2F5566",
          600: "#1F4252",
          700: "#163341",
          800: "#0F2730",
          900: "#0A1A24",
          950: "#06121A",
        },
        mint: {
          50: "#E6FBF7",
          100: "#C2F5EA",
          200: "#8FEBD7",
          300: "#5FE0C4",
          400: "#2DD4BF", // ← accent principal (équiv. logo / affiche)
          500: "#14B8A6",
          600: "#0F9488",
          700: "#0E7C72",
          800: "#115E59",
          900: "#134E48",
        },
        // 🔁 Anciens tokens "gold"/"amber" remappés sur mint pour bascule globale
        // (294 occurrences `gold-*` / `amber-*` migrent sans refactor par fichier)
        gold: {
          50: "#E6FBF7",
          100: "#C2F5EA",
          200: "#8FEBD7",
          300: "#5FE0C4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0F9488",
          700: "#0E7C72",
          800: "#115E59",
          900: "#134E48",
        },
        amber: {
          50: "#E6FBF7",
          100: "#C2F5EA",
          200: "#8FEBD7",
          300: "#5FE0C4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0F9488",
          700: "#0E7C72",
          800: "#115E59",
          900: "#134E48",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
