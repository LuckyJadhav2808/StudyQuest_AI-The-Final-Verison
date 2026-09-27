# Tasks: Modern 2.5D Chibi Companion & Pet System Overhaul

## Phase 1: 2.5D Companion Sprite Engine & Audio/Haptics Foundation

### Task 1: Build the Modern 2.5D Chibi Companion Sprite Engine
**Description:** Implement `src/components/gamification/ChibiCompanionSprite.tsx`, an expressive, resolution-independent vector 2.5D character engine supporting Questie (Scholar Owl), Cyber Cat, and Emerald Dragon across 4 animation states (`idle`, `walk`, `celebrate`, `sleep`).
**Acceptance criteria:**
- [x] Renders all 3 species (owl, cat, dragon) with rich multi-stop gradients, dynamic shadows, and 2.5D chibi aesthetics.
- [x] Supports 4 states: `idle` (breathing + autonomous eye blinks), `walk` (bobbing hop), `celebrate` (jumping with sparkles), `sleep` (curled pose with Zzz indicator).
- [x] Respects `size` prop cleanly without distortion or pixelation (32px to 160px).
- [x] Respects `reduceMotion` user accessibility preferences.
**Verification:**
- [x] Component renders smoothly in story/isolation with all 3 species and 4 states.
- [x] TypeScript checks pass: `npx tsc --noEmit`.
**Dependencies:** None
**Files touched:**
- `src/components/gamification/ChibiCompanionSprite.tsx`
**Estimated scope:** Medium (1-2 files)

---

### Task 2: Implement Tactile Sound Effects & Haptics Controller
**Description:** Build `src/lib/companionAudio.ts` providing Web Audio synthesized vocalizations (chirps, purrs, munches, celebration chimes) and `navigator.vibrate` haptic feedback patterns, safe against browser autoplay blocks.
**Acceptance criteria:**
- [x] Audio functions for `playChirp()`, `playPurr()`, `playMunch()`, `playCelebrate()`, `playSnore()`.
- [x] Integrates with Web Audio synthesizer so zero external audio assets are strictly required (fallback resilient).
- [x] Haptic vibration helper triggering subtle pulses on mobile devices (`[15, 30, 15]ms`).
- [x] Respects global sound mute settings in `localStorage` / ThemeContext.
**Verification:**
- [x] Audio triggers on user click without uncaught promise rejection.
- [x] Mobile haptic triggers when supported.
**Dependencies:** None
**Files touched:**
- `src/lib/companionAudio.ts`
**Estimated scope:** Small (1 file)

---

## Checkpoint: Foundation
- [x] Verify `ChibiCompanionSprite` renders all 3 characters across 4 action states.
- [x] Verify `companionAudio` generates crisp audio and handles mute states.

---

## Phase 2: Unified Mobile Drawer & Desktop Quick-Dock

### Task 3: Create Production-Grade Companion Drawer & Quick-Dock
**Description:** Build `src/components/pets/CompanionDrawer.tsx` utilizing `vaul` on mobile (< 768px) and a glassmorphic popover on desktop. Consolidates companion feeding, petting, minigame triggers, evolution progression, and skin swapping in a unified, ergonomic surface.
**Acceptance criteria:**
- [x] Mobile uses `vaul` bottom sheet with drag handle, velocity snapping, and safe area inset support.
- [x] Desktop uses elevated glassmorphic card with backdrop blur and accessible focus management.
- [x] Includes quick-feed button (with coin check), pet action (+happiness & EXP), and skin switch pills.
- [x] Displays live level, hunger/happiness progress bars, and stage title.
**Verification:**
- [x] Drawer opens cleanly from trigger; dismisses with swipe down or overlay tap.
- [x] Responsive behavior verified across 375px (mobile) and 1440px (desktop).
**Dependencies:** Tasks 1, 2
**Files touched:**
- `src/components/pets/CompanionDrawer.tsx`
**Estimated scope:** Medium (2-3 files)

---

### Task 4: Refactor Roaming Companion & Sidebar Questie
**Description:** Upgrade `src/components/dashboard/PixelPet.tsx` and `src/components/gamification/QuestieMascot.tsx` to utilize `ChibiCompanionSprite` and link to `CompanionDrawer`. Remove obstructive old popups and optimize edge roaming paths.
**Acceptance criteria:**
- [x] Replace static image keying canvas in `PixelPet.tsx` with `ChibiCompanionSprite`.
- [x] Companion walking animation along header/footer triggers `walk` state during translation and `idle` when resting.
- [x] Clicking companion triggers squash-and-stretch reaction, vocalization sound, and opens `CompanionDrawer`.
- [x] Sidebar Questie can be toggled between Expressive Owl and 2.5D Chibi modes.
- [x] Pet visibility toggle preserved and non-obstructive to page content.
**Verification:**
- [x] Wandering companion transitions seamlessly between hopping and idling without console errors.
- [x] Zero DOM clipping or background canvas artifacts.
**Dependencies:** Tasks 1, 2, 3
**Files touched:**
- `src/components/dashboard/PixelPet.tsx`
- `src/components/gamification/QuestieMascot.tsx`
**Estimated scope:** Medium (2 files)

---

## Checkpoint: Unified Navigation & Roaming
- [x] Test mobile swipe gestures on bottom drawer (Vaul).
- [x] Ensure roaming companion walks smoothly along screen edges without obstructing interactive buttons or text.

---

## Phase 3: Dashboard Study Desk Bento Widget & Pet Sanctuary Polish

### Task 5: Build Interactive Study Desk Bento Widget
**Description:** Create `src/components/dashboard/StudyDeskWidget.tsx` and embed it into `DashboardContent.tsx`. Renders an interactive 2.5D study desk scene with the companion, emotional reactions to student achievements, and quick care actions.
**Acceptance criteria:**
- [x] 2.5D desk illustration featuring study accessories (books, lamp, potion).
- [x] Companion sits on desk reacting dynamically: focus state during active timer, celebration when quests complete, sleeping at late hours.
- [x] Quick care action bar directly on card (Feed, Pet, Study Together).
- [x] Seamless integration into dashboard bento layout with 8px rhythm.
**Verification:**
- [x] Widget renders seamlessly in classic, modern, and lofi dashboard modes.
- [x] Clicking actions awards EXP, triggers audio, and updates Firestore state.
**Dependencies:** Tasks 1, 2, 3
**Files touched:**
- `src/components/dashboard/StudyDeskWidget.tsx`
- `src/components/dashboard/DashboardContent.tsx`
**Estimated scope:** Medium (2 files)

---

### Task 6: Upgrade Pet Sanctuary (`/pets`) with 2.5D Habitat
**Description:** Polish `src/components/pets/PetContent.tsx` to feature a 2.5D habitat stage with animated wardrobe previews, multi-path evolution indicators, and tactile mini-game interactions.
**Acceptance criteria:**
- [x] Pet habitat viewport showcases the full 2.5D character in active/idle/play states with particle effects.
- [x] Wardrobe accessory preview dynamically renders accessories on the 2.5D sprite.
- [x] Evolution progress card highlights clear multi-path milestones with unlock animations.
- [x] Full responsiveness across mobile, tablet, and desktop viewports.
**Verification:**
- [x] Navigate to `/pets` and verify all tabs (Overview, Wardrobe, Evolution) operate without error.
- [x] `npm run lint` and `npx tsc --noEmit` succeed cleanly.
**Dependencies:** Tasks 1, 2, 3, 5
**Files touched:**
- `src/components/pets/PetContent.tsx`
**Estimated scope:** Medium (1-2 files)

---

## Checkpoint: Final Acceptance
- [x] Full end-to-end integration verified: companion state syncs with Firestore (`usePet`).
- [x] Level-up celebrations trigger multi-layer confetti and celebratory audio.
- [x] Zero TypeScript or linter errors across all modified files.
