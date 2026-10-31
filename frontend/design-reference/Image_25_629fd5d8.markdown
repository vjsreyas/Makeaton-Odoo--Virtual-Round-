---
name: Kinetic Financial
colors:
  surface: '#f5faff'
  surface-dim: '#d5dbdf'
  surface-bright: '#f5faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4f9'
  surface-container: '#e9eef3'
  surface-container-high: '#e4e9ee'
  surface-container-highest: '#dee3e8'
  on-surface: '#171c20'
  on-surface-variant: '#45474b'
  inverse-surface: '#2c3135'
  inverse-on-surface: '#ecf1f6'
  outline: '#76777c'
  outline-variant: '#c6c6cc'
  surface-tint: '#595e6a'
  primary: '#080d16'
  on-primary: '#ffffff'
  primary-container: '#1e232d'
  on-primary-container: '#858a97'
  inverse-primary: '#c2c6d4'
  secondary: '#506600'
  on-secondary: '#ffffff'
  secondary-container: '#c1f100'
  on-secondary-container: '#546b00'
  tertiary: '#000e1d'
  on-tertiary: '#ffffff'
  tertiary-container: '#152434'
  on-tertiary-container: '#7c8b9f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee2f0'
  primary-fixed-dim: '#c2c6d4'
  on-primary-fixed: '#171c25'
  on-primary-fixed-variant: '#424752'
  secondary-fixed: '#c3f400'
  secondary-fixed-dim: '#abd600'
  on-secondary-fixed: '#161e00'
  on-secondary-fixed-variant: '#3c4d00'
  tertiary-fixed: '#d4e4fa'
  tertiary-fixed-dim: '#b8c8dd'
  on-tertiary-fixed: '#0d1d2d'
  on-tertiary-fixed-variant: '#39485a'
  background: '#f5faff'
  on-background: '#171c20'
  surface-variant: '#dee3e8'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  metric-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

The design system establishes a high-performance, forward-looking aesthetic for enterprise billing, revenue intelligence, and subscription management. It shifts enterprise software away from dense, bureaucratic data sheets into an ergonomic, modern operating cockpit. 

The aesthetic is characterized by:
- **Atmospheric Luminosity:** An airy, cool silver-blue background canvas that reduces eye strain while maintaining clarity.
- **Floating Command Anchors:** Deep obsidian and slate docked islands that focus critical workflow controls, primary actions, and dense sub-ledgers.
- **High-Velocity Accents:** Precision hits of electric chartreuse/lime that guide instant actionability, urgent thresholds, and live selections without overwhelming the layout.
- **Tactile Soft Surfaces:** Generously rounded, low-elevation card surfaces combined with pill-shaped control clusters, avatar stacks, and modular balance tiles.

## Colors

The palette leverages a high-contrast relationship between deep charcoal/slate surfaces and vibrant neon chartreuse, seated over a soft, ice-tinted slate backdrop.

### Roles and Application
- **Canvas (`#EEF3F8` / `#E8EEF5`):** Serves as the atmospheric base. All structural containers sit upon this soft, cool plane.
- **Primary / Dominant Surface (`#1E232D`):** Applied to floating navigational capsules, active sub-system drawers, dark work surfaces, and primary typography.
- **Secondary / Kinetic Chartreuse (`#CCFF00` to `#D2F800`):** Reserved exclusively for active navigation states, high-priority conversion triggers (e.g., "Pay out now"), live status pills, and vital timeline markers.
- **Tertiary Slate (`#5C6B7E`):** Handles secondary metadata, muted header groupings, subtle timeline tracks, and input border indicators.
- **Surface Elevation Cards (`#FFFFFF` & `#F8FAFC`):** Crisp white containers create positive separation from the ice-blue canvas, holding metrics, filters, and transaction summaries.

## Typography

The typography leverages **Plus Jakarta Sans** across all major communication levels to balance geometric structure with approachable, modern humanist details. 

- **Numerical Hierarchy:** Financial figures (`metric-display`) prioritize heavy weights with tighter tracking (`-0.02em`) to maintain numerical presence at glanceable scale.
- **Labels & Micro-copy:** Uppercase and compact labels (`label-md`) govern ledger tags, invoice tracking codes, and status chips with clear letter-spacing.
- **Code Identifiers:** `code-sm` (powered by JetBrains Mono) is strictly utilized for reference numbers, transactional hashes, and invoice IDs (e.g., `#427-012`).

## Layout & Spacing

The layout utilizes a structured 12-column responsive fluid grid with fixed boundary margins.

### Spatial Rhythm
- **Page Margin:** Generous 32px (`margin`) margins on desktop ensure floating elements breathe over the canvas backdrop, compressing to 16px (`margin-mobile`) on viewport sizes under 768px.
- **Docked Control Island:** Floating navigation capsules and filter clusters float at the page top or section headers, utilizing an inner padding of `space-xs` and `space-sm` around internal interactive pills.
- **Card Spacing:** KPI tiles and detailed ledger panels follow an inner component padding of `space-lg` (24px) for desktop and `space-md` (16px) for mobile.
- **Data Gap Rhythm:** Micro-gaps between list items within dark command docks stay tight (`space-xs` to `space-sm`), maintaining information density without clutter.

## Elevation & Depth

Visual depth is achieved through high-contrast tonal layering and ultra-soft ambient shadowing, rather than multi-layered borders.

- **Canvas Level (Ground):** Cool ice-slate tint (`#EEF3F8`).
- **Surface Level 1 (Light Cards):** Pure `#FFFFFF` cards with an ultra-diffused atmospheric shadow: `0 8px 32px -4px rgba(30, 35, 45, 0.05), 0 2px 8px -2px rgba(30, 35, 45, 0.03)`. This renders elements crisp without sharp boundary lines.
- **Surface Level 2 (Dark Command Containers):** Heavy charcoal structures (`#1E232D`) sit elevated with deep ambient absorption: `0 16px 40px -8px rgba(15, 23, 42, 0.22)`.
- **Surface Level 3 (Nested Slate Sub-Cards):** Containers placed inside dark command panels employ a soft translucent slate layer (`#353D4A` or `rgba(255, 255, 255, 0.08)`) with zero shadow, utilizing opacity to separate contextual sub-ledgers.
- **Interactive Focus / Kinetic Float:** Active pill selections in electric chartreuse (`#CCFF00`) feature a soft neon rim glow: `0 0 16px rgba(204, 255, 0, 0.35)`.

## Shapes

The system relies on a pill-forward and organic corner architecture:

- **Capsule / Full Round (`9999px`):** Used universally for top-level navigation pods, button triggers, filter selection pills, status flags, and avatar stacks.
- **Structural Master Cards (`2rem` / `32px`):** Top-level operational cards and bottom ledger workspaces use expansive 32px radii, establishing a calm, approachable frame.
- **Nested Internal Tiles (`1rem` / `16px`):** Secondary cards within main containers step down to a balanced 16px corner profile.
- **Avatar Stacks:** Strict circular geometry (`50%`) with `2px` surface-matched isolation rings.

## Components

### Buttons & Pill Controls
- **Kinetic Action Button:** Solid `#CCFF00` background, `#1E232D` typography, pill shape (`roundedness: 3`). Used for terminal enterprise actions ("Pay out now", "Create an Invoice").
- **Dark Island Button:** Charcoal `#1E232D` container housing grouped text/icon pills. Sub-items highlight into lime or white on selection.
- **Ghost Filter Capsule:** `#FFFFFF` background with soft muted slate borders (`#E2E8F0`), housing dropdown triggers with trailing carets.

### Cards & Metric Displays
- **Light Metric Tile:** Clean white background with large-type currency displays, small secondary sub-labels, and integrated horizontal milestone progress tracks with chartreuse marker heads.
- **Dark Interactive Workspace:** Large `#1E232D` parent container holding dual-pane ledgers: a left master list of queued invoices, and a right slate-toned detail viewport displaying company credentials and payout breakdowns.

### Lists & Avatar Stacks
- **Interactive Invoice Rows:** Subtle slate hover transitions (`#2B323F`). Active row displays a prominent highlight pill capsule around transaction data.
- **Horizontal Avatar Overlaps:** Overlapping user clusters spaced at `-8px` with white or dark slate stroke dividers, used directly beneath timelines to indicate account assignees.

### Chips & Badges
- **Status Pills:** Compact rounded capsules displaying dynamic workflow phases (`Unpaid`, `Draft`, `Issued`). Active states leverage `#CCFF00` with dark text; resting states employ soft translucent fills.