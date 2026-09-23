import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
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
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        /** App page surface behind every in-app page — client/src/styles/brand-tokens.css */
        app: "hsl(var(--app-background) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        /** Universal brand palette — client/src/styles/brand-tokens.css */
        brand: {
          "accent-from": "hsl(var(--brand-accent-from) / <alpha-value>)",
          "accent-to": "hsl(var(--brand-accent-to) / <alpha-value>)",
          amethyst: "hsl(var(--brand-amethyst) / <alpha-value>)",
          rose: "hsl(var(--brand-rose) / <alpha-value>)",
          sky: "hsl(var(--brand-sky) / <alpha-value>)",
          success: "hsl(var(--brand-success) / <alpha-value>)",
          warning: "hsl(var(--brand-warning) / <alpha-value>)",
          destructive: "hsl(var(--brand-destructive) / <alpha-value>)",
          star: "hsl(var(--brand-star) / <alpha-value>)",
          "star-deep": "hsl(var(--brand-star-deep) / <alpha-value>)",
          foreground: "hsl(var(--brand-foreground) / <alpha-value>)",
        },
        /** Getting Started v4 — client/design/getting_started_v4.html */
        gs: {
          "accent-from": "hsl(var(--gs-accent-from) / <alpha-value>)",
          "accent-to": "hsl(var(--gs-accent-to) / <alpha-value>)",
          amethyst: "hsl(var(--gs-amethyst) / <alpha-value>)",
          rose: "hsl(var(--gs-rose) / <alpha-value>)",
          sky: "hsl(var(--gs-sky) / <alpha-value>)",
          success: "hsl(var(--gs-success) / <alpha-value>)",
          warning: "hsl(var(--gs-warning) / <alpha-value>)",
          destructive: "hsl(var(--gs-destructive) / <alpha-value>)",
          linkedin: "hsl(var(--gs-linkedin) / <alpha-value>)",
          "oauth-google-surface":
            "hsl(var(--gs-oauth-google-surface) / <alpha-value>)",
          "oauth-microsoft-surface":
            "hsl(var(--gs-oauth-microsoft-surface) / <alpha-value>)",
          "accent-foreground":
            "hsl(var(--gs-accent-foreground) / <alpha-value>)",
        },
        /** Marketing homepage — client/design/homepage_redesigned_final.html */
        home: {
          bg: "hsl(var(--home-bg) / <alpha-value>)",
          "bg-elevated": "hsl(var(--home-bg-elevated) / <alpha-value>)",
          fg: "hsl(var(--home-fg) / <alpha-value>)",
          muted: "hsl(var(--home-muted) / <alpha-value>)",
          border: "hsl(var(--home-border) / <alpha-value>)",
          amethyst: "hsl(var(--home-amethyst) / <alpha-value>)",
          rose: "hsl(var(--home-rose) / <alpha-value>)",
          sky: "hsl(var(--home-sky) / <alpha-value>)",
          "trust-green": "hsl(var(--home-trust-green) / <alpha-value>)",
          "star-muted": "hsl(var(--home-star-muted) / <alpha-value>)",
          cold: "hsl(var(--home-cold-text) / <alpha-value>)",
          "cold-icon": "hsl(var(--home-cold-icon) / <alpha-value>)",
          linkedin: "hsl(var(--home-linkedin) / <alpha-value>)",
          "avatar-g2": "hsl(var(--home-avatar-green-2) / <alpha-value>)",
          "avatar-p2": "hsl(var(--home-avatar-purple-2) / <alpha-value>)",
          "avatar-r2": "hsl(var(--home-avatar-rose-2) / <alpha-value>)",
          sim: "hsl(var(--home-sim-surface) / <alpha-value>)",
          cta: "hsl(var(--home-cta-surface) / <alpha-value>)",
          footer: "hsl(var(--home-footer-surface) / <alpha-value>)",
          "oauth-g-blue": "hsl(var(--home-oauth-g-blue) / <alpha-value>)",
          "oauth-g-green": "hsl(var(--home-oauth-g-green) / <alpha-value>)",
          "oauth-g-yellow": "hsl(var(--home-oauth-g-yellow) / <alpha-value>)",
          "oauth-g-red": "hsl(var(--home-oauth-g-red) / <alpha-value>)",
          "oauth-ms-red": "hsl(var(--home-oauth-ms-red) / <alpha-value>)",
          "oauth-ms-green": "hsl(var(--home-oauth-ms-green) / <alpha-value>)",
          "oauth-ms-blue": "hsl(var(--home-oauth-ms-blue) / <alpha-value>)",
          "oauth-ms-yellow": "hsl(var(--home-oauth-ms-yellow) / <alpha-value>)",
        },
      },
      boxShadow: {
        "brand-cta": "0 5px 18px hsl(var(--brand-rose) / 0.22)",
        "brand-cta-lg": "0 8px 26px hsl(var(--brand-rose) / 0.22)",
        "brand-card": "0 8px 32px hsl(var(--brand-amethyst) / 0.15)",
        "gs-cta": "0 3px 12px hsl(var(--gs-rose) / 0.22)",
        "gs-cta-lg": "0 6px 20px hsl(var(--gs-rose) / 0.22)",
        "gs-thumb": "0 2px 6px hsl(var(--gs-amethyst) / 0.3)",
        /** getting_started_v4.html .step-tab.active / .next-btn */
        "gs-tab-active": "0 2px 10px hsl(var(--gs-rose) / 0.12)",
        "gs-next": "0 4px 20px hsl(var(--gs-rose) / 0.22)",
        "gs-next-hover": "0 8px 32px hsl(var(--gs-rose) / 0.22)",
        "home-mockup":
          "0 20px 60px hsl(var(--home-shadow-ink) / 0.07), 0 2px 6px hsl(var(--home-shadow-ink) / 0.03)",
        "home-play": "0 6px 28px hsl(var(--home-rose) / 0.22)",
        "home-play-hover": "0 10px 36px hsl(var(--home-rose) / 0.22)",
        "home-cta": "0 4px 16px hsl(var(--home-rose) / 0.22)",
        "home-cta-lg": "0 8px 28px hsl(var(--home-rose) / 0.22)",
        "home-bridge": "0 2px 12px hsl(var(--home-shadow-ink) / 0.06)",
        "home-vs": "0 2px 8px hsl(var(--home-shadow-ink) / 0.06)",
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
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "gs-marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "import-modal-bar": {
          "0%": { width: "0%" },
          "30%": { width: "35%" },
          "60%": { width: "70%" },
          "80%": { width: "88%" },
          "100%": { width: "100%" },
        },
        /** client/design/getting_started_v4.html @keyframes modalIn */
        importModalIn: {
          from: {
            opacity: "0",
            transform: "translateY(16px) scale(0.97)",
          },
          to: {
            opacity: "1",
            transform: "none",
          },
        },
        /** homepage_redesigned_final.html */
        homeHeroFadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "none" },
        },
        homeHeroSlideIn: {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "none" },
        },
        homeGradShiftOnly: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        homeMockupFloat: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        homeBarUp: {
          to: { transform: "scaleY(1)" },
        },
        homeFeedIn: {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "none" },
        },
        homeBridgeUp: {
          "0%, 100%": { bottom: "10%", opacity: "0" },
          "20%": { opacity: "0.6" },
          "50%": { bottom: "50%", opacity: "0.6" },
          "80%": { opacity: "0" },
        },
        homeBridgeDown: {
          "0%, 100%": { top: "10%", opacity: "0" },
          "20%": { opacity: "0.6" },
          "50%": { top: "50%", opacity: "0.6" },
          "80%": { opacity: "0" },
        },
        homeCtaOrb: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(15px, -15px) scale(1.08)" },
        },
        homeBlink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateX(40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "toast-in-left": {
          from: { opacity: "0", transform: "translateX(-40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "toast-out": {
          from: { opacity: "1", transform: "translateX(0)" },
          to: { opacity: "0", transform: "translateX(40px)" },
        },
        "toast-out-left": {
          from: { opacity: "1", transform: "translateX(0)" },
          to: { opacity: "0", transform: "translateX(-40px)" },
        },
        "toast-shrink": {
          from: { transform: "scaleX(1)" },
          to: { transform: "scaleX(0)" },
        },
        /** Universal Loader — three brand-hue dots pulsing in sequence */
        "loader-pulse": {
          "0%, 70%, 100%": { transform: "scale(0.55)", opacity: "0.45" },
          "35%": { transform: "scale(1.15)", opacity: "1" },
        },
        /** locked-dashboard.html @keyframes modalIn — centered dialogs */
        "modal-spring-in": {
          from: {
            opacity: "0",
            transform: "translate(-50%, calc(-50% + 20px)) scale(0.92)",
          },
          to: {
            opacity: "1",
            transform: "translate(-50%, -50%) scale(1)",
          },
        },
        "modal-spring-out": {
          from: {
            opacity: "1",
            transform: "translate(-50%, -50%) scale(1)",
          },
          to: {
            opacity: "0",
            transform: "translate(-50%, calc(-50% + 20px)) scale(0.92)",
          },
        },
        /** locked-dashboard.html modalIn — mobile fullscreen dialogs */
        "modal-spring-in-fs": {
          from: {
            opacity: "0",
            transform: "scale(0.92) translateY(20px)",
          },
          to: {
            opacity: "1",
            transform: "scale(1) translateY(0)",
          },
        },
        "modal-spring-out-fs": {
          from: {
            opacity: "1",
            transform: "scale(1) translateY(0)",
          },
          to: {
            opacity: "0",
            transform: "scale(0.92) translateY(20px)",
          },
        },
        "modal-overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "modal-overlay-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
      animationDelay: {
        "home-bar-11": "1.1s",
        "home-bar-115": "1.15s",
        "home-bar-12": "1.2s",
        "home-bar-125": "1.25s",
        "home-bar-13": "1.3s",
        "home-bar-135": "1.35s",
        "home-bar-14": "1.4s",
        "home-bar-145": "1.45s",
        "home-bar-16": "1.6s",
        "home-bar-18": "1.8s",
        "home-bar-20": "2s",
        "home-hero-015": "0.15s",
        "home-hero-04": "0.4s",
        "home-hero-05": "0.5s",
        "home-hero-065": "0.65s",
        "home-hero-08": "0.8s",
        "home-hero-095": "0.95s",
        "home-hero-12": "1.2s",
        "home-cta-orb": "4s",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
        "scale-in": "scale-in 0.4s ease-out",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "bounce-subtle": "bounce-subtle 2s infinite",
        "spin-slow": "spin 20s linear infinite",
        "gs-marquee": "gs-marquee 18s linear infinite",
        "import-modal-bar": "import-modal-bar 3s ease-in-out forwards",
        "import-modal-in":
          "importModalIn 250ms cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "home-hero-fade-up": "homeHeroFadeUp 0.6s ease both",
        "home-hero-slide-in": "homeHeroSlideIn 0.7s ease both",
        "home-grad-shift": "homeGradShiftOnly 4s ease-in-out infinite 1s",
        "home-mockup-float": "homeMockupFloat 6s ease-in-out infinite",
        "home-bar-up": "homeBarUp 0.8s ease forwards 1s",
        "home-feed-in": "homeFeedIn 0.4s ease both",
        "home-bridge-up": "homeBridgeUp 3s ease-in-out infinite",
        "home-bridge-down": "homeBridgeDown 3s ease-in-out infinite 1.5s",
        "home-cta-orb": "homeCtaOrb 8s ease-in-out infinite",
        "home-blink": "homeBlink 1.5s ease infinite",
        "home-blink-slow": "homeBlink 2s ease infinite",
        "toast-in": "toast-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "toast-in-left":
          "toast-in-left 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "toast-out": "toast-out 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "toast-out-left":
          "toast-out-left 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "toast-shrink": "toast-shrink linear forwards",
        "loader-pulse":
          "loader-pulse 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "modal-spring-in":
          "modal-spring-in 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "modal-spring-out":
          "modal-spring-out 250ms cubic-bezier(0.4, 0, 0.2, 1) both",
        "modal-spring-in-fs":
          "modal-spring-in-fs 350ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "modal-spring-out-fs":
          "modal-spring-out-fs 250ms cubic-bezier(0.4, 0, 0.2, 1) both",
        "modal-overlay-in": "modal-overlay-in 350ms ease-out both",
        "modal-overlay-out": "modal-overlay-out 250ms ease-out both",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
