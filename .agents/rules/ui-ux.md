# Senior UI/UX Engineering Rules

Always apply these principles when creating or editing frontend code and user interfaces:

1. **Aesthetic Depth & Colors**:
   - Never use flat primary red/green/blue or pure `#000000`. Use tailored HSL scales (`#090D16` base, `#111827` surface, `#1F2937` overlay).
   - In dark mode, replace solid borders with translucent white (`border border-white/10` or `border-slate-800/80`).
   - Use multi-layer ambient shadows (`shadow-xl shadow-black/40`) and subtle glassmorphism (`backdrop-blur-xl bg-slate-900/70`).

2. **Tactile Micro-Interactions**:
   - Every clickable card and button must have distinct `:hover` (`hover:scale-[1.015] hover:-translate-y-0.5`) and `:active` (`active:scale-[0.98]`) feedback.
   - Use spring physics for Framer Motion transitions (`stiffness: 400, damping: 28`).

3. **Mobile-First Ergonomics**:
   - Minimum tap target: `44px × 44px`.
   - On viewports `< 768px`, use bottom sheets/drawers instead of centered desktop dialogs.
   - Respect iOS Home Bar safe area: `padding-bottom: max(16px, env(safe-area-inset-bottom, 16px))`.
   - Prevent iOS auto-zoom on inputs by ensuring `text-base md:text-sm` (16px minimum on mobile).

4. **Zero Layout Shifts**:
   - Always specify explicit aspect-ratios or image dimensions to maintain 0 CLS.
   - Use shimmering skeleton placeholders instead of blank loading states.
