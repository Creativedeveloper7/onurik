---
name: Cinematic Portfolio
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
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
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b6b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#333031'
  tertiary-container: '#e8e1e3'
  on-tertiary-container: '#676365'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e2dd'
  primary-fixed-dim: '#c9c6c1'
  on-primary-fixed: '#1c1c19'
  on-primary-fixed-variant: '#474743'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e8e1e3'
  tertiary-fixed-dim: '#cbc5c7'
  on-tertiary-fixed: '#1d1b1c'
  on-tertiary-fixed-variant: '#494648'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-xl:
    fontFamily: Montserrat
    fontSize: 80px
    fontWeight: '500'
    lineHeight: 96px
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Montserrat
    fontSize: 64px
    fontWeight: '500'
    lineHeight: 72px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '500'
    lineHeight: 56px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: 0em
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  margin-x: 64px
  stack-unit: 8px
  section-gap: 128px
---

## Brand & Style
This design system focuses on a high-end, cinematic aesthetic tailored for professional portfolios. The brand personality is sophisticated, immersive, and intentional. It leverages a **Minimalist** foundation with a focus on negative space to allow visual content to breathe.

The emotional response should be one of quiet confidence and premium quality. By utilizing high-contrast typography against deep, near-black surfaces, the UI creates a "theater-mode" experience that prioritizes the user's work. Transitions should be fluid and subtle, reinforcing the polished, director-level execution of the interface.

## Colors
The palette is rooted in a "Noir" aesthetic. The primary background is a deep, near-black (#131313), which provides the foundation for the cinematic look. Typography utilizes an off-white (#f0ede8) to reduce visual fatigue while maintaining high legibility.

Secondary colors are used sparingly for container surfaces and subtle dividers (#2a2a2a), creating depth without breaking the dark mode immersion. Pure white (#ffffff) is reserved for high-priority interactive states and critical calls to action.

## Typography
Headlines and display text use **Montserrat** at a Medium (500) weight to provide a structured, geometric presence. The tracking is slightly tightened on larger display sizes to enhance the editorial feel.

Body text is paired with **Manrope**, a clean geometric sans-serif that ensures maximum readability at smaller scales. The combination of Montserrat’s classic geometric shapes and Manrope’s modern utility creates a balanced, professional hierarchy. Label styles should use uppercase Manrope with increased letter spacing for a refined, technical look.

## Layout & Spacing
The layout follows a **Fixed Grid** model with a maximum width of 1440px to ensure visual consistency across large displays. A 12-column system is used with generous 24px gutters.

The spacing rhythm is based on an 8px unit. Vertical rhythm is expansive; section gaps should be large (128px+) to reinforce the cinematic, high-end feel. Content should be grouped logically with tighter internal padding (8px, 16px) and wider external margins to emphasize the minimalist philosophy.

## Elevation & Depth
Depth is achieved through **Tonal Layers** rather than traditional shadows. Surfaces closer to the user are represented by slightly lighter shades of gray (e.g., #1c1c1c or #2a2a2a).

Where shadows are necessary for focus, use **Ambient Shadows**: extremely diffused, low-opacity black shadows (0.4 alpha) with a large blur radius (32px+). Subtle, low-contrast outlines (1px solid #2a2a2a) are preferred for defining card boundaries, keeping the interface flat and sophisticated.

## Shapes
This design system utilizes the **ROUND_FOUR** configuration (Level 2). Standard UI elements like buttons and input fields feature a 0.5rem (8px) corner radius. Larger containers and cards utilize 1rem (16px) or 1.5rem (24px) for a soft, approachable, yet structured appearance. This moderate rounding prevents the UI from feeling too industrial while maintaining its modern edge.

## Components
- **Buttons**: Primary buttons feature the off-white background with near-black text. Hover states should involve a slight scale-up (1.02x). Secondary buttons use a ghost style with a 1px border.
- **Cards**: Use a subtle #1c1c1c background. Borders should be minimal or non-existent, relying on the tonal difference to define the container.
- **Inputs**: Field backgrounds should be #1c1c1c with a bottom-only or subtle 4-sided border. The focus state uses the primary off-white for the border color.
- **Chips**: Small, pill-shaped elements with #2a2a2a backgrounds and uppercase label-md typography.
- **Lists**: Clean, borderless entries separated by 1px horizontal lines at #2a2a2a. 
- **Interactive Elements**: Use smooth 200ms cubic-bezier transitions for all hover and active states to maintain the premium feel.