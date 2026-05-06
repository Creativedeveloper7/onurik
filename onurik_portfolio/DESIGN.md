---
name: Onurik Portfolio
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c8c7be'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#929189'
  outline-variant: '#474741'
  surface-tint: '#c9c6c1'
  primary: '#ffffff'
  on-primary: '#31302d'
  primary-container: '#e5e2dd'
  on-primary-container: '#656461'
  inverse-primary: '#5f5e5b'
  secondary: '#ccc6ba'
  on-secondary: '#333028'
  secondary-container: '#4a473e'
  on-secondary-container: '#bab5a9'
  tertiary: '#ffffff'
  on-tertiary: '#313030'
  tertiary-container: '#e5e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e2dd'
  primary-fixed-dim: '#c9c6c1'
  on-primary-fixed: '#1c1c19'
  on-primary-fixed-variant: '#474743'
  secondary-fixed: '#e8e2d6'
  secondary-fixed-dim: '#ccc6ba'
  on-secondary-fixed: '#1e1b14'
  on-secondary-fixed-variant: '#4a473e'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-xl:
    fontFamily: notoSerif
    fontSize: 84px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg:
    fontFamily: notoSerif
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: notoSerif
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  body-lg:
    fontFamily: inter
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 32px
  margin: 64px
  section-gap: 160px
  element-gap: 24px
---

## Brand & Style

This design system is anchored in a philosophy of "Technical Sophistication meets Humanist Warmth." It bridges the gap between the precision of systems engineering and the evocative nature of high-end design. The style is **Cinematic Minimalism**, utilizing heavy negative space, extreme typographic scale, and subtle atmospheric depth to create an immersive, gallery-like experience.

The aesthetic draws from modern editorial design and high-fashion digital showcases. It prioritizes clarity and intentionality, using motion and depth to guide the user through Onurik’s professional narrative. The emotional response is one of quiet confidence, authority, and meticulous attention to detail.

## Colors

The palette is strictly limited to maintain a high-end, cinematic feel. 

*   **Primary (Off-White):** Used for primary headings and body text to reduce eye strain compared to pure white, providing a "paper-like" warmth.
*   **Neutral (Near-Black):** The foundation of the UI. It provides the "infinite" depth required for a cinematic dark mode.
*   **Secondary (Warm Neutral):** Reserved for low-priority text, borders, and subtle accents. It provides a bridge between the dark background and light text.
*   **Tertiary (Surface):** Used for card backgrounds and elevated containers to create subtle separation from the base layer.

## Typography

This design system employs a classic editorial pairing. **Noto Serif** (serving as a high-fidelity proxy for editorial serifs) provides the narrative voice—used for large-scale displays, quotes, and project titles. Its purpose is to feel timeless and intellectual.

**Inter** provides the functional layer. It is used for all UI elements, body copy, and technical data. This juxtaposition reinforces the "engineer and designer" duality. Maintain generous line-heights in body copy to ensure readability against the dark background. Use uppercase labels for metadata and section headers to establish a clear information hierarchy.

## Layout & Spacing

The layout utilizes a **12-column fixed grid** with generous margins to create a focused, high-end feel. 

*   **Section Gaps:** Large vertical distances (160px+) are used to separate major narrative blocks, ensuring each project or bio section feels like its own "scene."
*   **Information Density:** Technical sections may use split-column layouts (6/6 or 4/8) to present data alongside imagery.
*   **Logo Carousels:** Horizontal, edge-to-edge carousels should use a slow, "infinite" scroll with low-opacity logos (#f0ede8 at 40% opacity) to remain unobtrusive.

## Elevation & Depth

This design system avoids traditional drop shadows. Depth is communicated through:

*   **Glassmorphism:** The navigation bar uses a backdrop blur (20px) with a semi-transparent fill of the background color (#0a0a0a at 70% opacity). This creates a sense of the content passing underneath.
*   **Tonal Layering:** Project cards use a slightly lighter surface color (#1a1a1a) to sit "above" the background.
*   **Atmospheric Blur:** Large, low-opacity warm gradients may be used deep in the background layer to provide a "lens flare" or cinematic lighting effect, though they should never interfere with text legibility.

## Shapes

The shape language is architectural and precise. A **Soft (0.25rem)** border radius is applied to most UI elements (buttons, inputs, cards) to prevent the design from feeling too aggressive or "brutalist," while maintaining a professional, structured edge. 

Images and large project containers may remain sharp (0px) to lean into the editorial, full-bleed aesthetic.

## Components

*   **Sticky Navbar:** Minimalist height (80px), centered or split-logo layout. Frosted glass effect with a subtle 1px border at the bottom (#f0ede8 at 10% opacity).
*   **Project Cards:** Dark surfaces with no visible borders until hover. On hover, the image should subtly scale (1.05x) and the surface color should lighten slightly.
*   **Buttons:** Primary buttons are outlined (#f0ede8) with a hover state that fills the button with the primary color and switches text to the background color. 
*   **Editorial Bio:** Massive serif headline followed by a 2-column text layout. The first paragraph of text should use the `body-lg` style.
*   **Split-Layout Forms:** Technical contact forms where the left side contains a "Call to Action" in Noto Serif and the right side contains clean, minimal Inter-based input fields.
*   **Horizontal Carousels:** Greyscale logo treatments for brands worked with, utilizing a "fade out" mask on the left and right edges.