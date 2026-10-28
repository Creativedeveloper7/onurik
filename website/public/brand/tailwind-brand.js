/**
 * Onurik brand theme for the Tailwind Play CDN.
 * Load right after cdn.tailwindcss.com on every page; it replaces per-page configs so
 * existing semantic tokens (background, primary, surface-*) and the stone/neutral scales
 * all resolve to the warm poster palette: mustard, tomato red, flame, cream, cocoa.
 */
(function () {
  var brand = {
    mustard: "#F2A516",
    sun: "#FFCB05",
    tomato: "#D8202A",
    crimson: "#A8121A",
    flame: "#F24C00",
    butter: "#F6D58A",
    cream: "#F7E3C8",
    paper: "#FBF3E4",
    cocoa: "#2A1B0E",
    ink: "#160E07",
    navy: "#26307A",
  };

  var warm = {
    50: "#FFF8EC",
    100: "#F7E7CF",
    200: "#EBD6B5",
    300: "#D9C2A0",
    400: "#B89B74",
    500: "#957A57",
    600: "#6E5539",
    700: "#4F3A24",
    800: "#3A2816",
    900: "#2A1B0E",
    950: "#1A1007",
  };

  var semantic = {
    background: "#1E140B",
    "on-background": "#F7E7CF",
    surface: "#1E140B",
    "surface-dim": "#1A1109",
    "surface-bright": "#4A3420",
    "surface-tint": brand.mustard,
    "surface-variant": "#402C19",
    "surface-container-lowest": "#150D06",
    "surface-container-low": "#24180D",
    "surface-container": "#2B1D10",
    "surface-container-high": "#352414",
    "surface-container-highest": "#402C19",
    "on-surface": "#F7E7CF",
    "on-surface-variant": "#D9C2A0",
    outline: "#A88B63",
    "outline-variant": "#5A4128",
    primary: brand.mustard,
    "on-primary": brand.cocoa,
    "primary-container": brand.sun,
    "on-primary-container": brand.cocoa,
    "primary-fixed": brand.butter,
    "primary-fixed-dim": "#E9B94B",
    "on-primary-fixed": brand.cocoa,
    "on-primary-fixed-variant": "#4F3A24",
    "inverse-primary": brand.crimson,
    secondary: brand.butter,
    "on-secondary": brand.cocoa,
    "secondary-container": "#5A3A12",
    "on-secondary-container": brand.butter,
    "secondary-fixed": brand.cream,
    "secondary-fixed-dim": "#E9CFA6",
    "on-secondary-fixed": brand.cocoa,
    "on-secondary-fixed-variant": "#4F3A24",
    tertiary: "#F7E7CF",
    "on-tertiary": brand.cocoa,
    "tertiary-container": brand.cream,
    "on-tertiary-container": "#6E5539",
    "tertiary-fixed": brand.cream,
    "tertiary-fixed-dim": "#E9CFA6",
    "on-tertiary-fixed": brand.cocoa,
    "on-tertiary-fixed-variant": "#4F3A24",
    error: "#FF7A6B",
    "on-error": "#2A0303",
    "error-container": brand.crimson,
    "on-error-container": "#FFDAD6",
    "inverse-surface": "#F7E7CF",
    "inverse-on-surface": brand.cocoa,
  };

  var colors = Object.assign({}, semantic, brand, {
    stone: warm,
    neutral: warm,
    zinc: warm,
    gray: warm,
    black: brand.ink,
  });

  var display = ["Anton", "Impact", "sans-serif"];
  var body = ["Space Grotesk", "system-ui", "sans-serif"];

  window.tailwind = window.tailwind || {};
  window.tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: colors,
        borderRadius: { DEFAULT: "0.375rem", lg: "0.625rem", xl: "1rem", "2xl": "1.5rem", full: "9999px" },
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
          bagel: ["Bagel Fat One", "Anton", "sans-serif"],
          marker: ["Permanent Marker", "cursive"],
          mono: ["Space Mono", "ui-monospace", "monospace"],
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
          "label-caps": ["Space Mono", "ui-monospace", "monospace"],
        },
        fontSize: {
          "body-lg": ["18px", { lineHeight: "28px", letterSpacing: "0", fontWeight: "400" }],
          "body-md": ["16px", { lineHeight: "24px", letterSpacing: "0", fontWeight: "400" }],
          "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "700" }],
          "display-xl": ["88px", { lineHeight: "0.92", letterSpacing: "0", fontWeight: "400" }],
          "display-lg": ["64px", { lineHeight: "0.95", letterSpacing: "0", fontWeight: "400" }],
          "headline-md": ["34px", { lineHeight: "1.05", letterSpacing: "0.01em", fontWeight: "400" }],
        },
        boxShadow: {
          sticker: "4px 4px 0 0 #160E07",
          "sticker-lg": "8px 8px 0 0 #160E07",
        },
      },
    },
  };
})();
