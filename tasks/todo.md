# Tasks: Notes Local-First Autosave Resilience & Questie Motion Polish

## Phase 1: Local-First Autosave Resilience & Undo Reliability

### Task 1: Resilient Local-First NotesContext
**Description:** Refactor `src/context/NotesContext.tsx` to prevent destructive state rollbacks when Firestore writes fail, mirror all note updates immediately to `localStorage`, and queue failed syncs for retry when online.
**Acceptance criteria:**
- [x] Saves every note update immediately to `localStorage` (`sq_local_note_${noteId}`) with timestamp.
- [x] Removes `setNotes(previousNotes)` rollback on Firestore errors so user's typed text is never lost.
- [x] Maintains an offline sync queue (`sq_notes_sync_queue`) and flushes it when the browser comes online.
- [x] Does not show alarming red error toasts for silent background autosave retries.
**Verification:**
- [x] Notes remain intact in memory and local storage even if Firestore rejects or network drops.
- [x] TypeScript check passes: `npx tsc --noEmit`.
**Dependencies:** None
**Files touched:**
- `src/context/NotesContext.tsx`
**Estimated scope:** Small (1 file)

---

### Task 2: Resilient Autosave Hook with Retry Logic
**Description:** Upgrade `src/hooks/useNotesAutosave.ts` to retain pending edits if a save operation fails, support offline status, and automatically schedule a retry backoff instead of silently dropping unsaved data.
**Acceptance criteria:**
- [x] If `onSave` throws an error, does not discard `pendingDataRef` and keeps `dirtyRef.current = true`.
- [x] Automatically schedules a retry after 5000ms if a save attempt fails.
- [x] Provides clear `saveStatus` states (`idle`, `saving`, `saved`, `offline`).
- [x] Ensures undo operations in the editor trigger debounced autosave without losing track of pending deltas.
**Verification:**
- [x] Autosave recovers gracefully and retries after temporary network disruption.
- [x] TypeScript check passes: `npx tsc --noEmit`.
**Dependencies:** Task 1
**Files touched:**
- `src/hooks/useNotesAutosave.ts`
**Estimated scope:** Small (1 file)

---

### Task 3: Robust Manual Save & Content Change in NotesContent
**Description:** Refactor `handleSave` in `src/components/notes/NotesContent.tsx` with try/catch local fallback, remove duplicate stale state overwrite (line 404), and ensure undo operations seamlessly preserve state.
**Acceptance criteria:**
- [x] `handleSave` wrapped in try/catch; if Firestore is offline, safely saves locally, updates editor UI to view mode, and toasts `'Note saved locally! 💾 (Will sync when online)'`.
- [x] Removes duplicate `setSelectedNote` call that overwrote `latestContent` with stale `editContent`.
- [x] Toolbar displays status indicator accurately (`Saving...`, `Saved`, `Saved locally`).
- [x] Editor stays stable across multiple undo/redo actions.
**Verification:**
- [x] Manual save completes successfully even with simulated offline mode.
- [x] Editor exits to view mode cleanly with all edits preserved.
**Dependencies:** Tasks 1, 2
**Files touched:**
- `src/components/notes/NotesContent.tsx`
**Estimated scope:** Small (1 file)

---

## Checkpoint 1: Notes Autosave & Local Persistence
- [x] All note changes persist locally without data loss.
- [x] Manual save and autosave work reliably whether online or offline.
- [x] Undo and redo do not trigger sync failure locks.

---

## Phase 2: Questie Mascot Streak Idle Motion & Hop Bursts

### Task 4: Calm Streak Idle & Finite Hop Bursts for Questie
**Description:** Update `src/components/gamification/QuestieMascot.tsx` and `src/components/gamification/ChibiCompanionSprite.tsx` so that continuous streaks ($\ge 3$) display the flame aura, "On Fire 🔥" badge, and proud expression with calm, gentle breathing (`duration: 2.8s`), while energetic jumping hops play only as finite 3-hop bursts on click or milestone achievements.
**Acceptance criteria:**
- [x] Streak $\ge 3$ displays the "On Fire 🔥" badge and vibrant mood aura without infinite 0.55s jumping.
- [x] Mascot sprite uses calm idle breathing (`y: [0, -3.5, 0]`, `duration: 2.8s`) during continuous streak.
- [x] Clicking Questie plays an energetic 3-hop burst (~1.6s) before smoothly returning to calm idle.
- [x] Milestone events (e.g. note saved, quest finished) trigger a brief celebratory burst and then settle down.
**Verification:**
- [x] Sidebar Questie with streak $\ge 3$ breathes calmly without constant agitation.
- [x] Clicking Questie triggers lively hops that terminate after 3 bounces.
**Dependencies:** None
**Files touched:**
- `src/components/gamification/QuestieMascot.tsx`
- `src/components/gamification/ChibiCompanionSprite.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint 2: Mascot Motion & Performance
- [x] Questie animation is calm and distraction-free on active streaks.
- [x] Interaction clicks feel playful and responsive without infinite loops.

---

## Phase 3: Meta Tag Deprecation & Verification

### Task 5: Mobile Web App Meta Tag Update
**Description:** Update `src/app/layout.tsx` to add `<meta name="mobile-web-app-capable" content="yes" />` alongside the deprecated Apple-specific meta tag.
**Acceptance criteria:**
- [x] `<meta name="mobile-web-app-capable" content="yes" />` added to `<head>`.
- [x] Console deprecation warning eliminated.
**Verification:**
- [x] Inspect `src/app/layout.tsx` markup.
**Dependencies:** None
**Files touched:**
- `src/app/layout.tsx`
**Estimated scope:** XS (1 file)

---

### Task 6: Full Verification & Build Check
**Description:** Run comprehensive build and type-checking suite to ensure zero regressions across the codebase.
**Acceptance criteria:**
- [x] `npm run build` succeeds cleanly.
- [x] Zero TypeScript or Turbopack errors.
**Verification:**
- [x] Build output exit code 0.
**Dependencies:** Tasks 1, 2, 3, 4, 5
**Files touched:** None
**Estimated scope:** XS

---

## Checkpoint 3: Final Acceptance
- [x] All acceptance criteria met across all 3 phases.
- [x] Production build verified and ready for commit.
