/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ocean Blue and Sunset Orange theme for premium fishing experience
        background: "oklch(1 0 0)", // Soft White  
        foreground: "oklch(0.25 0 0)", // Dark Slate
        card: "oklch(0.98 0.01 85)", // Light Sand
        "card-foreground": "oklch(0.25 0 0)", // Dark Slate
        popover: "oklch(1 0 0)", // Soft White
        "popover-foreground": "oklch(0.25 0 0)", // Dark Slate
        primary: "oklch(0.5 0.15 240)", // Ocean Blue
        "primary-foreground": "oklch(1 0 0)", // Soft White
        secondary: "oklch(0.65 0.2 45)", // Sunset Orange
        "secondary-foreground": "oklch(1 0 0)", // Soft White  
        muted: "oklch(0.98 0.01 85)", // Light Sand
        "muted-foreground": "oklch(0.25 0 0)", // Dark Slate
        accent: "oklch(0.65 0.2 45)", // Sunset Orange
        "accent-foreground": "oklch(1 0 0)", // Soft White
        destructive: "oklch(0.6 0.2 25)", // Sunset Red
        "destructive-foreground": "oklch(1 0 0)", // Soft White
        border: "oklch(0.9 0.01 85)", // Light Sand Border
        input: "oklch(0.95 0.01 85)", // Input Background
        ring: "oklch(0.5 0.15 240)", // Ocean Blue Focus Ring
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}
