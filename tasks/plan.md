# Implementation Plan: Next-Gen Production Architecture Enhancements

## Overview
Following the comprehensive architectural audit of all 18 sections and 30 routes of StudyQuest AI, this plan decomposes high-impact architectural enhancements into vertically sliced, verifiable phases. Focus areas target high-leverage bottlenecks identified during benchmark reverse-engineering: iCalendar (.ics) academic calendar export for Exams and Timetables, SuperMemo-2 (SM-2) spaced repetition algorithm for the DSA Dungeon, and direct integration between the Focus Pomodoro Timer and the Native Web Audio Binaural Focus Synthesizer.

---

## Architecture Decisions

1. **RFC 5545 iCalendar (.ics) Engine (`src/lib/icalEngine.ts`)**
   - **Rationale:** Students rely on Google Calendar, Apple Calendar, and Outlook to organize their lives. Adding client-side `.ics` generator with `UID`, `DTSTAMP`, `DTSTART`, `SUMMARY`, and `VALARM` enables one-click calendar exports for exams and class timetables in 0MB server cost.
   - **Privacy & Sovereignty:** Runs 100% locally in the browser using Blob downloads (`text/calendar;charset=utf-8`), avoiding external calendar API tokens or OAuth permissions.

2. **SuperMemo-2 (SM-2) Spaced Repetition Engine for DSA Dungeon (`src/lib/dsa/sm2Engine.ts`)**
   - **Rationale:** Students currently mark problems as "Revising" manually. Re-engineering this with the gold-standard SM-2 spaced repetition algorithm (used by Anki and SuperMemo) automatically schedules optimal revision intervals ($I_1 = 1$, $I_2 = 6$, $I_n = I_{n-1} \times EF$) based on user recall quality ($q \in [0, 5]$).
   - **Backward Compatibility:** Stores metadata (`easeFactor`, `interval`, `repetitions`, `nextReviewDate`) directly in the existing Firestore problem progress documents.

3. **Autonomous Pomodoro & Binaural Focus Audio Heartbeat (`TimerContext.tsx` & `binauralSynth.ts`)**
   - **Rationale:** Instead of requiring students to manually open the Jukebox and select Gamma waves after starting a focus timer, provide an optional "Auto-Synthesize Focus Audio" toggle in the Timer settings. Starting a focus timer smoothly fades in the 40Hz Gamma frequency or Brown noise, automatically fading out when the timer rings.

---

## Task List

### Phase 1: Academic iCalendar (.ics) Interoperability
- [ ] **Task 1**: Implement pure client-side RFC 5545 iCalendar generator in `src/lib/icalEngine.ts` supporting single events and recurring weekly timetables.
- [ ] **Task 2**: Integrate `.ics` export buttons in `src/components/exams/ExamsContent.tsx` and `src/components/timetable/TimetableContent.tsx`.

### Checkpoint 1: Calendar Interoperability
- [ ] `.ics` export passes RFC 5545 specification validation.
- [ ] Generated files open seamlessly in Apple Calendar, Google Calendar, and Outlook.
- [ ] `npm run build` passes with 0 errors.

### Phase 2: SM-2 Spaced Repetition for DSA Arena
- [ ] **Task 3**: Create SM-2 algorithm scheduler in `src/lib/dsa/sm2Engine.ts` with interval calculations and recall grading.
- [ ] **Task 4**: Integrate revision due badges and rating buttons (`Again`, `Hard`, `Good`, `Easy`) into `src/components/dsa/DsaCuratedSheetView.tsx` and `src/components/dsa/DsaProblemDetailModal.tsx`.

### Checkpoint 2: Spaced Repetition Verification
- [ ] Rating a problem updates interval and next review date accurately.
- [ ] Problems due for review appear in a prominent "Due for Revision" filter.
- [ ] `npx tsc --noEmit` exits with code 0.

### Phase 3: Pomodoro & Binaural Synthesizer Integration
- [ ] **Task 5**: Wire `TimerContext.tsx` focus state transitions with `binauralSynth.ts` audio crossfader.
- [ ] **Task 6**: Add quick binaural wave preset selector directly inside the Pomodoro timer UI (`src/components/timer/TimerContent.tsx`).

### Checkpoint 3: Complete Production Architecture Polish
- [ ] Timer start/stop cleanly fades binaural oscillators without audio clipping.
- [ ] All 39 routes compile cleanly in Next.js Turbopack (`npm run build`).

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Timezone mismatch in `.ics` calendar imports | Med | Use UTC formatting (`Z` suffix) with explicit local time conversion in `icalEngine.ts`. |
| AudioContext blocked by browser autoplay policy | Low | Ensure audio synthesis only triggers after direct user interaction (clicking the Start Timer button). |
| Complex SM-2 state cluttering old problem progress | Low | Set default `easeFactor = 2.5` for legacy problems, ensuring smooth backward compatibility. |
