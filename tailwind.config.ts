import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Public Sans Variable"', "system-ui", "sans-serif"],
        display: ["Anton", '"Public Sans Variable"', "sans-serif"],
      },
      colors: {
        papier: "oklch(var(--papier) / <alpha-value>)",
        tinte: {
          DEFAULT: "oklch(var(--tinte) / <alpha-value>)",
          soft: "oklch(var(--tinte-soft) / <alpha-value>)",
        },
        gruen: {
          DEFAULT: "oklch(var(--gruen) / <alpha-value>)",
          tief: "oklch(var(--gruen-tief) / <alpha-value>)",
        },
        gelb: "oklch(var(--gelb) / <alpha-value>)",
        rot: "oklch(var(--rot) / <alpha-value>)",
        linie: "oklch(var(--linie) / <alpha-value>)",
        fusszeile: "oklch(var(--fusszeile) / <alpha-value>)",
        border: "oklch(var(--border) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "oklch(var(--success) / <alpha-value>)",
          foreground: "oklch(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "oklch(var(--warning) / <alpha-value>)",
          foreground: "oklch(var(--warning-foreground) / <alpha-value>)",
        },
        status: {
          empty: "oklch(var(--status-empty) / <alpha-value>)",
          partial: "oklch(var(--status-partial) / <alpha-value>)",
          complete: "oklch(var(--status-complete) / <alpha-value>)",
          "empty-border": "oklch(var(--status-empty-border) / <alpha-value>)",
          "partial-border": "oklch(var(--status-partial-border) / <alpha-value>)",
          "complete-border": "oklch(var(--status-complete-border) / <alpha-value>)",
        },
      },
      boxShadow: {
        versatz: "4px 4px 0 oklch(var(--tinte))",
      },
      borderWidth: {
        "1.5": "1.5px",
        "2.5": "2.5px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
