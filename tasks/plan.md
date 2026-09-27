# Implementation Plan: Modern 2.5D Chibi Companion & Pet System Overhaul

## Overview
Elevate StudyQuest's companion and pet experience from static PNG slices and fragmented popups into a unified, production-grade 2.5D Chibi Companion System. This overhaul combines modern vector 2.5D illustrated aesthetics (smooth gradients, expressive facial rigs, squash-and-stretch spring physics), a lightweight 4-state action engine (idle, walk/hop, celebrate, sleep), tactile Web Audio & mobile haptic feedback, a gesture-driven iOS bottom drawer (`vaul`), an interactive Dashboard Study Desk Bento widget, and a polished Pet Sanctuary habitat (`/pets`).

---

## Architecture Decisions

1. **Visual Style — Vector / Modern 2.5D Chibi**
   - Soft outlines, rich multi-stop gradients, dynamic shadow underlays, and SVG/CSS spring keyframes.
   - Moving away from pixel-art bounding box canvas slicing to vector-crisp 2.5D characters that scale flawlessly from 32px navbar badges to 128px sanctuary avatars.
   - Core Roster: **Questie (Scholar Owl)**, **Cyber Cat**, and **Emerald Dragon**.

2. **Animation Engine & State Machine**
   - 4 Canonical Action States:
     - `idle`: Breathing cycle, autonomous eye blinks, ear/wing twitch.
     - `walk`: Directional hop/stride across platform surfaces with tilt.
     - `celebrate`: Exuberant jump, squash-and-stretch, floating sparkle particles.
     - `sleep`: Curled resting pose, floating Zzz particles, soft ambient pulse.
   - Hardware-accelerated CSS and Framer Motion spring physics (`type: "spring", stiffness: 350, damping: 25`).

3. **Tactile Micro-Interactions (SFX & Haptics)**
   - Synthesized/Web Audio subtle sound sprites for pet vocalizations (owl chirp, cat purr, dragon chirp, munch, celebration chime).
   - `navigator.vibrate` integration for mobile haptic feedback on feeding, petting, and level-up milestones.

4. **Unified Ergonomic Navigation Model**
   - **Mobile**: Draggable iOS-style bottom drawer powered by `vaul` with snap points, velocity dismiss, and safe-area padding (`env(safe-area-inset-bottom)`).
   - **Desktop**: Glassmorphic quick-dock popover (`backdrop-blur-xl bg-slate-900/90 border border-white/10`).
   - Replaces fragmented popups and obstructive floating HUD buttons with a cohesive design system component.

5. **Study Desk Bento Widget & Sanctuary Habitat**
   - **Dashboard**: Interactive "Study Desk Playground" card displaying companion sitting on desk with live emotional reactions to daily quests, streak milestones, and Pomodoro timers.
   - **Sanctuary (`/pets`)**: 2.5D living environment with interactive feeding animations, wardrobe equipping, and mini-games.

---

## Task Breakdown

### Phase 1: 2.5D Companion Sprite Engine & Audio/Haptics Foundation
- [ ] **Task 1**: Build the modern 2.5D Chibi Companion Engine (`ChibiCompanionSprite.tsx`) with 4 distinct action states (idle, hop/walk, celebrate, sleep) and dynamic skin rendering for Questie, Cyber Cat, and Emerald Dragon.
- [ ] **Task 2**: Implement tactile sound effects & mobile haptic feedback controller (`companionAudio.ts`) for pet reactions (chirp, purr, munch, cheer, sleep).

### Checkpoint: Foundation
- [ ] Verify sprite component renders all 3 characters across 4 action states without layout shift.
- [ ] Verify audio synthesizer/sprites play crisp vocalizations and handle browser autoplay permissions gracefully.

---

### Phase 2: Unified Mobile Drawer & Desktop Quick-Dock
- [ ] **Task 3**: Create the production-grade Companion Drawer & Dock (`CompanionDrawer.tsx`) using `vaul` on mobile and glassmorphic popover on desktop, unifying feed, pet, level stats, and skin switching.
- [ ] **Task 4**: Refactor Roaming Companion & Sidebar Questie (`PixelPet.tsx` & `QuestieMascot.tsx`) to adopt the new 2.5D engine and drawer trigger, removing layout interference and phantom popups.

### Checkpoint: Unified Navigation & Roaming
- [ ] Test mobile swipe gestures on bottom drawer (Vaul).
- [ ] Ensure roaming companion walks smoothly along screen edges without obstructing interactive buttons or text.

---

### Phase 3: Dashboard Study Desk Bento Widget & Pet Sanctuary Polish
- [ ] **Task 5**: Build the interactive "Study Desk Playground" Dashboard Widget (`StudyDeskWidget.tsx`) embedded into the dashboard bento grid with live status, mood auras, and quick actions.
- [ ] **Task 6**: Upgrade `/pets` Pet Sanctuary (`PetContent.tsx`) with 2.5D habitat stage, tactile feeding animations, and wardrobe integration.

### Checkpoint: Complete
- [ ] Companion state seamlessly synchronizes with Firestore (`usePet`).
- [ ] Level-up celebrations trigger multi-layer confetti and celebratory audio.
- [ ] Zero TypeScript or linter errors across all modified files.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mobile performance jank with continuous animations | Medium | Use CSS `transform: translate3d` and GPU-accelerated layers; respect `useMotion().reduceMotion` settings. |
| Audio playback blocked by browser autoplay policy | Low | Gate audio playback strictly behind user interactions (tap/click/drag). |
| Vaul drawer gesture collision with mobile bottom nav | Medium | Anchor drawer trigger above bottom navigation bar and account for safe area insets. |
| Firestore sync lag during rapid feeding/petting | Low | Use optimistic state updates already in `usePet` with debounce on rapid coin debits. |
