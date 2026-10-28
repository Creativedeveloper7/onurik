/**
 * Onurik brand theme for the Tailwind Play CDN.
 * Load right after cdn.tailwindcss.com on every page; it replaces per-page configs so
 * existing semantic tokens (background, primary, surface-*) and the stone/neutral scales
 * all resolve to the dark glass palette: near-black surfaces, light text, one orange accent.
 */
(function () {
  var brand = {
    mustard: "#FF5A1F", // accent orange (legacy token names kept so markup restyles)
    sun: "#FF7A3D",
    tomato: "#F04C1E",
    crimson: "#B8330F",
    flame: "#FF5A1F",
    butter: "#FFD6C0",
    cream: "#F2EFEB", // light: text on dark
    paper: "#FAF8F5",
    cocoa: "#141415", // dark: surfaces, text on light
    ink: "#0A0A0B",
    navy: "#2A2A2E",
    accent: "#FF5A1F",
  };

  var warm = {
    50: "#FAFAF9",
    100: "#F2EFEB",
    200: "#E2DFDA",
    300: "#C9C5BF",
    400: "#A19D97",
    500: "#7A7671",
    600: "#57534F",
    700: "#3A3836",
    800: "#262524",
    900: "#171717",
    950: "#0C0C0D",
  };

  var semantic = {
    background: "#0A0A0B",
    "on-background": "#F2EFEB",
    surface: "#0F0F10",
    "surface-dim": "#0A0A0B",
    "surface-bright": "#2A2A2C",
    "surface-tint": brand.accent,
    "surface-variant": "#232325",
    "surface-container-lowest": "#080809",
    "surface-container-low": "#121213",
    "surface-container": "#17171A",
    "surface-container-high": "#1E1E21",
    "surface-container-highest": "#26262A",
    "on-surface": "#F2EFEB",
    "on-surface-variant": "#B3AFA9",
    outline: "#6E6A65",
    "outline-variant": "#2C2B2A",
    primary: brand.accent,
    "on-primary": "#FFFFFF",
    "primary-container": "#3A1A0D",
    "on-primary-container": "#FFD6C0",
    "primary-fixed": "#FFD6C0",
    "primary-fixed-dim": "#FFB08A",
    "on-primary-fixed": "#2A0E03",
    "on-primary-fixed-variant": "#7A2A0A",
    "inverse-primary": brand.crimson,
    secondary: "#E2DFDA",
    "on-secondary": "#141415",
    "secondary-container": "#26262A",
    "on-secondary-container": "#E2DFDA",
    "secondary-fixed": "#F2EFEB",
    "secondary-fixed-dim": "#C9C5BF",
    "on-secondary-fixed": "#141415",
    "on-secondary-fixed-variant": "#3A3836",
    tertiary: "#F2EFEB",
    "on-tertiary": "#141415",
    "tertiary-container": "#26262A",
    "on-tertiary-container": "#A19D97",
    "tertiary-fixed": "#F2EFEB",
    "tertiary-fixed-dim": "#C9C5BF",
    "on-tertiary-fixed": "#141415",
    "on-tertiary-fixed-variant": "#3A3836",
    error: "#FF7A6B",
    "on-error": "#2A0303",
    "error-container": "#5A1208",
    "on-error-container": "#FFDAD6",
    "inverse-surface": "#F2EFEB",
    "inverse-on-surface": "#141415",
  };

  var colors = Object.assign({}, semantic, brand, {
    stone: warm,
    neutral: warm,
    zinc: warm,
    gray: warm,
    black: brand.ink,
  });

  var display = ["Urbanist", "system-ui", "sans-serif"];
  var body = ["Urbanist", "system-ui", "sans-serif"];
  var mono = ["Geist Mono", "ui-monospace", "monospace"];

  window.tailwind = window.tailwind || {};
  window.tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: colors,
        borderRadius: { DEFAULT: "0.5rem", lg: "0.75rem", xl: "1rem", "2xl": "1.5rem", "3xl": "2rem", full: "9999px" },
        spacing: {
          margin: "64px",
          "element-gap": "24px",
          "section-gap": "160px",
          gutter: "32px",
          "container-max": "1440px",
        },
        fontFamily: {
          display: display,
          anton: display,
          bagel: display,
          marker: display,
          dot: ["Doto", "Geist Mono", "monospace"],
          mono: mono,
          sans: body,
          "display-xl": display,
          "display-lg": display,
          "headline-md": display,
          "noto-serif": display,
          montserrat: body,
          manrope: body,
          inter: body,
          "body-lg": body,
          "body-md": body,
          "label-caps": mono,
        },
        fontSize: {
          "body-lg": ["18px", { lineHeight: "28px", letterSpacing: "0", fontWeight: "400" }],
          "body-md": ["16px", { lineHeight: "24px", letterSpacing: "0", fontWeight: "400" }],
          "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "700" }],
          "display-xl": ["88px", { lineHeight: "0.98", letterSpacing: "-0.035em", fontWeight: "600" }],
          "display-lg": ["64px", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "600" }],
          "headline-md": ["34px", { lineHeight: "1.08", letterSpacing: "-0.02em", fontWeight: "600" }],
        },
        boxShadow: {
          sticker: "0 20px 50px -20px rgba(0,0,0,0.7)",
          "sticker-lg": "0 30px 70px -24px rgba(0,0,0,0.8)",
          glow: "0 10px 30px -10px rgba(255,90,31,0.8)",
        },
      },
    },
  };
})();
