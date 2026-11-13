---
name: Studio Minimal
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#ae3200'
  on-secondary: '#ffffff'
  secondary-container: '#fd591e'
  on-secondary-container: '#521300'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1b1b'
  on-tertiary-container: '#848484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59e'
  on-secondary-fixed: '#3a0b00'
  on-secondary-fixed-variant: '#852400'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '500'
    lineHeight: 56px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 2rem
  space-xl: 4rem
---

## Brand & Style

This design system embodies an ultra-clean, distraction-free minimalist studio aesthetic inspired by the precision engineering of Leica and the playful industrial minimalism of Teenage Engineering. The target audience consists of modern creators, designers, and audio professionals who value rigorous craftsmanship and uncompromising focus. 

The UI evokes a calm, deliberate, and professional emotional response. By stripping away extraneous chrome and decorative noise, every interaction feels intentional and tactile. The visual language relies on heavy whitespace, absolute geometric clarity, and highly restrained color applications to guide the user's attention with mechanical precision.

## Colors

The palette is strictly curated around neutrality and singular focus. The canvas is set on a soft off-white (`#F8F8F8`), eliminating harsh stark whites in favor of a warm, paper-like foundation. 

- **Primary (`#000000`):** Pure black is reserved for primary actions, critical typography, and structural anchors, offering uncompromising legibility.
- **Secondary (`#FF5A1F`):** A subtle, high-impact coral-orange acts as the singular chromatic focal point, strictly deployed for active states, indicators, and recording triggers.
- **Neutral (`#E5E5E5`):** Crisp 1px light gray borders provide structural division without relying on heavy shadows or tonal clutter.

## Typography

Typography bridges industrial precision with digital readability. **Space Grotesk** is utilized for all headlines and labels, offering a technical, geometric voice with distinct character. **Inter** is deployed for body copy, ensuring supreme legibility across dense data and sustained reading sessions. 

For viewports below 768px, scale down `headline-xl` to 36px and `headline-lg` to 26px to maintain proportional balance and prevent wrapping anomalies.

## Layout & Spacing

The layout relies on a strict, predictable 12-column fluid grid system paired with generous outer margins to enforce the distraction-free studio aesthetic. 

- **Gutters:** Standardized at 1.5rem to maintain clean vertical corridors.
- **Margins:** Generous 2rem outer canvas margins (scaling to 4rem on desktop viewports) ensure content breathes and remains centered within the user's field of view.
- **Rhythm:** Spacing follows a strict geometric progression (`0.25rem`, `0.5rem`, `1rem`, `2rem`, `4rem`). Containers should never feel cramped; when in doubt, expand whitespace rather than introducing secondary dividers.

## Elevation & Depth

Depth is conveyed entirely through low-contrast outlines and tonal surface stratification, rejecting traditional drop shadows in favor of a flat, architectural drafting style.

- **Structural Boundaries:** Elements are separated by crisp 1px light gray borders (`#E5E5E5`) against the off-white canvas.
- **Active States:** Elevation shifts are indicated exclusively by swapping surface fills from neutral off-white to solid black or by introducing the coral-orange accent (`#FF5A1F`) for active triggers.

## Shapes

The shape language is strictly **Sharp (`0`)**, featuring 0px roundedness across all UI elements. This delivers the precise, industrial aesthetic of camera chassis and modular hardware hardware controls. Buttons, inputs, chips, and cards terminate in clean 90-degree right angles.

## Components

All components adhere to the sharp, border-driven minimalist paradigm, prioritizing immediate tactile feedback and high-contrast clarity.

- **Buttons:** Sharp 0px corners with solid black backgrounds (`#000000`) and white typography for primary actions. Secondary actions utilize transparent fills with 1px solid black borders. Hover states invert the fill to solid black or introduce the coral-orange accent (`#FF5A1F`) for critical recording states.
- **Chips:** Compact rectangular tags featuring 1px light gray borders and lowercase or uppercase tracking labels. Active chips fill solid black with white text or use the coral accent for status indicators.
- **Lists:** Clean typographic rows separated by 1px light gray horizontal rules. Generous internal padding prevents density fatigue.
- **Checkboxes & Radio Buttons:** Rendered as precise square and circular geometric outlines (1px border), filling with solid black or coral-orange when checked.
- **Input Fields:** Unstyled off-white backgrounds with a bottom-only or full 1px light gray border. Focus states transition the border to solid black or coral-orange without outer glows.
- **Cards:** Flat, bordered modular containers with generous internal padding, acting as isolated work surfaces reminiscent of mixing console panels.
- **Audio/Control Knobs & Faders (Specialized):** Minimalist linear track indicators featuring absolute geometry and high-contrast positional ticks.