# Implementation Plan: Notes Local-First Autosave Resilience & Questie Motion Polish

## Overview
Resolve the notes autosave failure and undo sync drop issue by establishing a resilient, local-first offline fallback with queue retry in `NotesContext`, `useNotesAutosave`, and `NotesContent`. Never discard user text on Firestore network drops. Simultaneously, eliminate Questie mascot's infinite 0.55s continuous hopping on active streaks by separating the persistent "On Fire 🔥" status badge from transient celebratory hop bursts (3-hop finite burst on click or milestone, settling into calm breathing idle). Finally, resolve the mobile web app meta tag deprecation warning in `src/app/layout.tsx`.

---

## Architecture Decisions

1. **Local-First Resilient Persistence (`NotesContext.tsx` & `useNotesAutosave.ts`)**
   - **Immediate Local Cache**: Whenever a note is updated, immediately mirror the latest title and content to `localStorage` (`sq_local_note_${noteId}`).
   - **No Destructive Rollback**: When Firestore `setDocument` fails due to network hiccups, offline state, or latency, **never** roll back the `notes` state in memory (`setNotes(previousNotes)`). The user's work is preserved locally.
   - **Sync Queue & Retry**: Store failed sync operations in an offline sync queue (`sq_notes_sync_queue`). When connectivity returns (`window.addEventListener('online')`) or on subsequent edits, retry syncing pending documents without blocking user actions.
   - **Graceful Manual Save**: Wrap manual `handleSave` in a try/catch block. If cloud sync fails, save locally, notify the user with `"Saved locally 💾 (Will sync when online)"`, close the editor cleanly, and eliminate the duplicate line 404 state overwrite.

2. **Calm Streak Idle & Finite Hop Bursts (`QuestieMascot.tsx` & `ChibiCompanionSprite.tsx`)**
   - **Streak $\ge 3$ Status vs. Motion**: An active streak gives Questie the flame aura, "On Fire 🔥" badge, and proud expression, but uses a calm, gentle breathing cycle (`duration: 2.8s`, `y: [0, -3.5, 0]`) rather than perpetual jumping.
   - **Transient Burst Celebrations**: Dynamic jumping hops (`action: 'celebrate'`) play as finite bursts (3 hops over ~1.8s) when explicitly triggered by a user click (`handleMascotClick`) or a milestone event (saving a note, completing a quest), before settling back to calm idle.
   - **Performance & Battery**: Removes an infinite 0.55s RAF/CSS transform loop from the sidebar, reducing continuous CPU usage and eliminating visual fatigue.

3. **Web Standards Compliance (`src/app/layout.tsx`)**
   - Include `<meta name="mobile-web-app-capable" content="yes" />` alongside `<meta name="apple-mobile-web-app-capable" content="yes" />` to satisfy modern PWA specifications and eliminate console warnings.

---

## Task List

### Phase 1: Local-First Autosave Resilience & Undo Reliability
- [ ] **Task 1**: Implement local-first caching, non-destructive updates, and offline sync queue in `src/context/NotesContext.tsx`.
- [ ] **Task 2**: Enhance `src/hooks/useNotesAutosave.ts` with error-resilient retries and retain dirty status on network interruptions.
- [ ] **Task 3**: Refactor `handleSave` and content change handling in `src/components/notes/NotesContent.tsx` with robust try/catch fallback, removing stale state overwrites.

### Checkpoint 1: Notes Autosave & Local Persistence
- [ ] Verify note edits persist immediately to `localStorage`.
- [ ] Verify simulating offline/network error does not roll back or erase user text.
- [ ] Verify manual save succeeds with local fallback toast when cloud sync is unavailable.
- [ ] Verify undo in Quill maintains consistent state without crashing autosave.

### Phase 2: Questie Mascot Streak Idle Motion & Hop Bursts
- [ ] **Task 4**: Update `src/components/gamification/QuestieMascot.tsx` and `src/components/gamification/ChibiCompanionSprite.tsx` to use calm floating breathing for persistent streaks and finite 3-hop bursts on click/milestones.

### Checkpoint 2: Mascot Motion & Performance
- [ ] Verify Questie on streak $\ge 3$ retains the fiery aura and "On Fire 🔥" badge while breathing calmly.
- [ ] Verify clicking Questie triggers a lively 3-hop burst and then settles smoothly back to calm idle.

### Phase 3: Meta Tag Deprecation & Verification
- [ ] **Task 5**: Add `<meta name="mobile-web-app-capable" content="yes" />` to `src/app/layout.tsx`.
- [ ] **Task 6**: Run complete build and verification suite (`npm run build`).

### Checkpoint 3: Production Readiness
- [ ] `npm run build` succeeds cleanly with 0 TypeScript and 0 Turbopack errors.
- [ ] Browser console deprecation warning resolved.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Local storage quota exceeded with large notes | Low | Only cache the current note and recent edits; catch `QuotaExceededError` gracefully. |
| Stale local backup overriding cloud updates | Med | Always compare `updatedAt` timestamps before restoring any local backup. |
| Incomplete autosave retry loop causing repeated toast notifications | Med | Silence background retry toasts; only show status in the subtle toolbar badge (`Saved locally` / `Syncing...`). |

---

## Open Questions
- None. Requirements are clear and validated.
