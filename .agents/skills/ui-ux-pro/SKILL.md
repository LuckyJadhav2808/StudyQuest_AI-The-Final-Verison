---
name: ui-ux-pro
description: Master senior UI/UX engineering design system, tactile micro-interactions, responsive ergonomics, and visual polish standards.
---

# UI/UX Pro — Senior Design & Frontend Engineering Master Standard

Use this skill whenever designing, building, or refining user interfaces, web applications, dashboards, or landing pages. It enforces elite visual aesthetics, tactile responsiveness, accessibility, and zero-jank frontend engineering.

---

## 1. Core Visual Aesthetics & Design System Tokens

### A. Semantic Color & Dark Mode Architecture
1. **Never Use Pure Flat Colors**:
   - Never use `#000000` for dark mode backgrounds. Use deep, layered slate/zinc:
     - Base Canvas: `#090D16` or `#0B0F19`
     - Level 1 Surface (Cards, Panels): `#111827` or `#131B2E`
     - Level 2 Surface (Dropdowns, Elevated Modals): `#1F2937` or `#1A243B`
     - Level 3 Surface (Tooltips, Floating Bars): `#374151`
2. **Layered Translucent Borders**:
   - In dark mode, replace solid opaque borders with translucent white:
     - Normal border: `border border-white/10` or `border-[var(--card-border)]`
     - Subtle separator: `border-white/5`
     - Focused/Active border: `border-indigo-500/40 ring-1 ring-indigo-500/20`
3. **Harmonious Accent Palette**:
   - Primary Brand: Royal Violet (`#7C3AED`) & Deep Indigo (`#4F46E5`)
   - Accent Cyan: `#06B6D4`
   - Success: Emerald (`#10B981`)
   - Warning: Amber (`#F59E0B`)
   - Danger: Rose (`#F43F5E`)

### B. Depth, Glassmorphism & Elevation
- **Multi-layer Ambient Shadows**:
  - Soft Card: `box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)`
  - Elevated Modal: `box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)`
- **Glassmorphism Formula**:
  - `backdrop-blur-xl bg-slate-900/60 border border-white/10 shadow-xl`
  - Subtle radial gradient underlays (`bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]`)

---

## 2. Tactile Micro-Interactions & Animation Guidelines

### A. Spring Physics Over Linear Animations
When using Framer Motion or CSS transitions:
- Never use linear or abrupt easing. Use natural spring physics:
  ```typescript
  transition: { type: "spring", stiffness: 350, damping: 25 }
  ```
- Fast cubic bezier for standard CSS transitions:
  ```css
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
  ```

### B. Interactive Feedback Hierarchy
1. **Buttons & Clickable Cards**:
   - **Resting**: Subtle shadow, crisp border.
   - **Hover**: Subtle lift `hover:-translate-y-0.5`, scale `hover:scale-[1.015]`, brightened border `hover:border-indigo-400/30`.
   - **Active (Press)**: Tactile compression `active:scale-[0.98] active:translate-y-0`.
   - **Focus**: Accessible ring `focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none`.
2. **Staggered Entrances**:
   - When rendering lists or grids, stagger children entrance with `delay: index * 0.04`.
3. **Smooth Layout Transitions**:
   - Use `layoutId` (Framer Motion) for active navigation tabs, segmented pills, and expanding modal dialogs.
4. **Skeleton Loading Over Spinners**:
   - Never show blank empty screens or plain spinners. Use pulsing gradient skeleton loaders (`bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 animate-pulse`).

---

## 3. Mobile-First Ergonomics & Touch Guidelines

1. **The Thumb Zone**:
   - Place primary navigation and primary actions within easy reach of the bottom thumb area (bottom bars, sticky bottom action trays).
   - Use mobile bottom drawers/sheets (`Drawer`) instead of centered desktop dialogs that are hard to reach.
2. **Minimum Touch Targets**:
   - All tap targets (buttons, icon triggers, list items) must be at least **44 × 44px** on touch viewports (`min-h-[44px] min-w-[44px]`).
3. **Safe Area Inset Handling**:
   - Always account for the iOS Home Bar and Android gesture pill:
     ```css
     padding-bottom: max(16px, env(safe-area-inset-bottom));
     ```
4. **Preventing iOS Zoom-in**:
   - All mobile `<input>` and `<select>` elements must have a minimum font size of **16px** (`text-base md:text-sm`) to prevent Safari from auto-zooming the viewport upon focus.
5. **Touch Gestures & Snapping**:
   - Horizontal pill filters should use `overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory`.

---

## 4. Typography & Visual Hierarchy

1. **Font Pairings**:
   - Primary Sans: Inter, Plus Jakarta Sans, Geist, or Outfit.
   - Monospace (Code/Numbers/Metrics): JetBrains Mono, Fira Code, or Geist Mono with `tabular-nums`.
2. **Heading & Body Scale**:
   - Display: `text-4xl md:text-5xl font-extrabold tracking-tight`
   - Section Title: `text-xl md:text-2xl font-bold tracking-tight text-white`
   - Subtitle: `text-sm md:text-base text-slate-400 font-normal leading-relaxed`
   - Caption / Meta: `text-xs font-medium text-slate-500 tracking-wide uppercase`

---

## 5. Pre-Flight Senior Designer Checklist

Before completing any UI feature or page:
- [ ] **Visual Hierarchy**: Does the most important action immediately capture the eye?
- [ ] **Contrast Check**: Is text readable against the background (WCAG AA 4.5:1 minimum)?
- [ ] **State Coverage**: Are Hover, Active, Focus, Loading, Empty, and Error states designed?
- [ ] **Responsive Test**: Tested from 375px (mobile) to 1440px (wide desktop)?
- [ ] **Zero Layout Shift (CLS)**: Are image dimensions and aspect ratios reserved in advance?
- [ ] **Accessible Keyboard Navigation**: Can the user navigate with `Tab`, `Enter`, and dismiss with `Escape`?
