# Tasks: Next-Gen Production Architecture Enhancements

## Phase 1: Academic iCalendar (.ics) Interoperability

### Task 1: RFC 5545 iCalendar Generator Engine
**Description:** Implement a robust client-side generator for standard `.ics` calendar files, supporting VEVENT blocks, alarm triggers (reminders), recurring weekly rules (RRULE for timetable lectures), and local-to-UTC date formatting.
**Acceptance criteria:**
- [ ] Generates valid RFC 5545 iCalendar format strings with required headers (`BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID`).
- [ ] Formats exam events with 24-hour and 1-hour pre-exam reminder alarms (`VALARM`).
- [ ] Formats weekly recurring classes with `RRULE:FREQ=WEEKLY;BYDAY=...`.
- [ ] Helper `downloadIcsFile(filename, content)` triggers native browser file download in 0MB server space.
**Verification:**
- [ ] TypeScript check passes: `npx tsc --noEmit`.
- [ ] Generated `.ics` file parses without syntax errors in standard calendar clients.
**Dependencies:** None
**Files touched:**
- `src/lib/icalEngine.ts`
**Estimated scope:** Small (1 file)

---

### Task 2: Calendar Export in Exams and Timetable UI
**Description:** Add prominent "Export to Calendar (.ics)" buttons in the Exams countdown header and Timetable view, letting students import their exam dates and course schedules into Google Calendar, Apple Calendar, or Outlook.
**Acceptance criteria:**
- [ ] Exams page has an "Add to Calendar" button that bundles all upcoming exams into `studyquest_exams.ics`.
- [ ] Timetable page has an "Export Schedule" button that exports all weekly classes into `studyquest_timetable.ics`.
- [ ] Visual toast notification informs user of successful calendar export.
**Verification:**
- [ ] Clicking export prompts download of valid `.ics` file.
- [ ] Build succeeds: `npx tsc --noEmit`.
**Dependencies:** Task 1
**Files touched:**
- `src/components/exams/ExamsContent.tsx`
- `src/components/timetable/TimetableContent.tsx`
**Estimated scope:** Small (2 files)

---

## Checkpoint 1: Calendar Interoperability
- [ ] All exam and timetable events export seamlessly.
- [ ] No regression on existing exam or timetable functions.

---

## Phase 2: SM-2 Spaced Repetition for DSA Arena

### Task 3: SuperMemo-2 (SM-2) Spaced Repetition Algorithm
**Description:** Implement the canonical SM-2 spaced repetition calculation module to compute updated ease factors ($EF$), repetition counts, and interval days based on user review performance ($q \in [0, 5]$).
**Acceptance criteria:**
- [ ] Calculates next interval: $I_1 = 1$, $I_2 = 6$, $I_n = \text{round}(I_{n-1} \times EF)$.
- [ ] Updates Ease Factor: $EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$, floored at $1.3$.
- [ ] Resets interval to 1 day on recall failure ($q < 3$).
- [ ] Returns `nextReviewDate` timestamp and helper `isProblemDueForReview(nextReviewDate)`.
**Verification:**
- [ ] Unit test logic verified via ts-node or clean build.
- [ ] TypeScript check passes: `npx tsc --noEmit`.
**Dependencies:** None
**Files touched:**
- `src/lib/dsa/sm2Engine.ts`
**Estimated scope:** Small (1 file)

---

### Task 4: Spaced Repetition Review UI in DSA Arena
**Description:** Add rating controls (`Again [1d]`, `Hard [3d]`, `Good [6d]`, `Easy [10d]`) inside the DSA Problem Detail modal and add a "Due for Review" filter badge in the DSA sheet tracker.
**Acceptance criteria:**
- [ ] DSA Problem modal displays SM-2 rating buttons when a problem is solved or in revision.
- [ ] Clicking a rating updates the problem's SM-2 metadata in Firestore and schedules the next review date.
- [ ] Curated sheet list adds a "Due for Review" counter badge and filter.
**Verification:**
- [ ] Rating updates `nextReviewDate` properly.
- [ ] Build succeeds: `npx tsc --noEmit`.
**Dependencies:** Task 3
**Files touched:**
- `src/components/dsa/DsaProblemDetailModal.tsx`
- `src/components/dsa/DsaCuratedSheetView.tsx`
**Estimated scope:** Medium (2 files)

---

## Checkpoint 2: Spaced Repetition Verification
- [ ] Problems due for review are clearly identified and filterable.
- [ ] SM-2 recall progression functions accurately across repeated reviews.

---

## Phase 3: Pomodoro & Binaural Synthesizer Integration

### Task 5: Autonomous Audio Coupling in TimerContext
**Description:** Enhance `TimerContext.tsx` with an option to automatically engage and disengage the native Web Audio Binaural Focus Synthesizer when Pomodoro sessions start and complete.
**Acceptance criteria:**
- [ ] Added `autoPlayBinaural: boolean` and `selectedWavePreset` state to `TimerContext`.
- [ ] Starting a focus session smoothly fades in the binaural oscillator nodes over 1.5 seconds.
- [ ] Pausing or completing a focus session smoothly fades out the audio nodes.
- [ ] Short/Long breaks pause the focus frequency and optionally play relaxing Alpha/Theta frequencies.
**Verification:**
- [ ] No audio pops or clicks on start/stop.
- [ ] Works cleanly when tab is active.
**Dependencies:** None
**Files touched:**
- `src/context/TimerContext.tsx`
**Estimated scope:** Small (1 file)

---

### Task 6: Focus Audio Controls in Pomodoro UI
**Description:** Embed quick ambient audio selector pills (Gamma 40Hz, Beta 18Hz, Brown Noise, Off) directly inside the Pomodoro timer interface in `TimerContent.tsx`.
**Acceptance criteria:**
- [ ] Timer page shows a subtle "Focus Sound" toggle bar under the timer dial.
- [ ] Switching presets immediately updates the Web Audio synth in real-time.
- [ ] Volume slider allows precise balancing between timer ticking and ambient waves.
**Verification:**
- [ ] Full production build succeeds: `npm run build`.
**Dependencies:** Task 5
**Files touched:**
- `src/components/timer/TimerContent.tsx`
**Estimated scope:** Small (1 file)

---

## Checkpoint 3: Complete Production Architecture Polish
- [ ] All 39 Next.js App Router routes compile cleanly.
- [ ] End-to-end user flows across Dashboard, Tasks, Habits, Notes, Reader, Timer, and DSA tested and verified.
