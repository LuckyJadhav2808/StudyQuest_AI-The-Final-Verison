# 🛠️ StudyQuest Developer Toolkit — Elite NPM Packages Handbook

A curated, battle-tested registry of developer-crafted NPM packages to elevate Frontend UX, State & Offline Storage, Backend Resilience, and Production Observability across full-stack Next.js and React projects.

---

## 📦 Master Installation Command

Install all packages in any Next.js / React project:

```bash
npm i cmdk vaul sonner use-sound @formkit/auto-animate nuqs dexie idb-keyval zustand @tanstack/react-query @tanstack/react-virtual quick-lru p-limit react-error-boundary web-vitals
```

---

## 1. 🎨 UI/UX & Micro-Interactions

### `cmdk` — Fast, Accessible Command Palette
* **Superpower**: Unstyled, accessible, zero-lag `Ctrl+K` command menu created by Paco Coursey (used by Linear & Vercel).
* **Usage**:
```tsx
import { Command } from 'cmdk';

export function QuickCommandMenu() {
  return (
    <Command.Dialog open={true} label="Global Command Menu">
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => navigate('/timer')}>Focus Timer</Command.Item>
          <Command.Item onSelect={() => navigate('/dsa')}>DSA Practice</Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

### `vaul` — iOS-Style Gesture Drawer
* **Superpower**: Smooth, draggable bottom drawer with velocity-based physics and snap points for mobile viewports.
* **Usage**:
```tsx
import { Drawer } from 'vaul';

export function MobileSheet({ triggerText, children }: { triggerText: string; children: React.ReactNode }) {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button>{triggerText}</button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="bg-white dark:bg-gray-900 flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 max-h-[85vh] p-4">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

### `sonner` — Stacked, Rich Toast Notifications
* **Superpower**: High-polish stacked toasts with promises, action buttons, and keyboard navigation.
* **Usage**:
```tsx
import { toast, Toaster } from 'sonner';

// Place <Toaster position="bottom-right" richColors /> in root layout

// Trigger with promises:
toast.promise(saveQuestData(), {
  loading: 'Saving quest progress...',
  success: 'XP updated and synced!',
  error: 'Could not sync. Stored offline.',
});
```

### `use-sound` — Tactile UI Audio Feedback
* **Superpower**: Lightweight sound sprite hook for game-like audio clicks, coins, and level-ups.
* **Usage**:
```tsx
import useSound from 'use-sound';

export function LevelUpButton() {
  const [playSuccess] = useSound('/sounds/success.mp3', { volume: 0.5 });

  return <button onClick={() => { playSuccess(); claimReward(); }}>Claim XP</button>;
}
```

### `@formkit/auto-animate` — Zero-Config Layout Transitions
* **Superpower**: Add smooth insert/remove/reorder animations to lists with a single ref.
* **Usage**:
```tsx
import { useAutoAnimate } from '@formkit/auto-animate/react';

export function AnimatedTaskList({ items }) {
  const [parent] = useAutoAnimate();
  return (
    <ul ref={parent}>
      {items.map(item => <li key={item.id}>{item.text}</li>)}
    </ul>
  );
}
```

### `nuqs` — Type-Safe URL Query State
* **Superpower**: Bind state directly to URL query parameters with zero lag or re-render flashes.
* **Usage**:
```tsx
import { useQueryState, parseAsString } from 'nuqs';

export function SearchFilter() {
  const [query, setQuery] = useQueryState('q', parseAsString.withDefault(''));
  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

---

## 2. ⚡ State, Offline Storage & Client DB

### `zustand` — Lightweight State Management
* **Superpower**: 1kB state management with selector subscriptions that eliminate context re-render cascades.
* **Usage**:
```tsx
import { create } from 'zustand';

interface PlayerStore {
  isPlaying: boolean;
  togglePlay: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  isPlaying: false,
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
}));
```

### `dexie` — Reactive Client Database (IndexedDB)
* **Superpower**: Full ACID relational database in the browser with live query hooks.
* **Usage**:
```tsx
import Dexie, { type EntityTable } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

interface Note { id?: number; title: string; content: string; updatedAt: Date; }

export const db = new Dexie('StudyQuestDB') as Dexie & { notes: EntityTable<Note, 'id'> };
db.version(1).stores({ notes: '++id, title, updatedAt' });

// In React:
export function NotesList() {
  const notes = useLiveQuery(() => db.notes.toArray());
  return <div>{notes?.map(n => <p key={n.id}>{n.title}</p>)}</div>;
}
```

### `idb-keyval` — Async Large Key-Value Store
* **Superpower**: Simple `get`/`set` replacement for `localStorage` that doesn't block the main thread and has no 5MB limit.
* **Usage**:
```tsx
import { get, set } from 'idb-keyval';

await set('study_session_cache', largeObjectPayload);
const cached = await get('study_session_cache');
```

### `@tanstack/react-query` — Async Server State & Sync
* **Superpower**: Automatic caching, polling, offline mutations, and background revalidation.
* **Usage**:
```tsx
import { useQuery } from '@tanstack/react-query';

export function useTrendingTracks() {
  return useQuery({
    queryKey: ['music', 'trending'],
    queryFn: () => fetch('/api/music/trending').then(res => res.json()),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
}
```

---

## 3. 🚀 Virtualization & Extreme Performance

### `@tanstack/react-virtual` — Headless Virtual List
* **Superpower**: Render lists of 100,000+ items (LeetCode questions, log events) at 60fps with minimal memory footprint.
* **Usage**:
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function VirtualProblemList({ problems }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: problems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
  });

  return (
    <div ref={parentRef} className="h-[500px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => (
          <div key={item.key} style={{ position: 'absolute', top: 0, transform: `translateY(${item.start}px)` }}>
            {problems[item.index].title}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### `quick-lru` — High-Throughput In-Memory LRU Cache
* **Superpower**: Bounded memory cache with automatic eviction for fast API responses and calculated values.
* **Usage**:
```tsx
import QuickLRU from 'quick-lru';

const searchCache = new QuickLRU({ maxSize: 100 });
searchCache.set('starboy', results);
```

### `p-limit` — Concurrent Promise Throttle
* **Superpower**: Batch async requests without exceeding rate limits or exhausting browser sockets.
* **Usage**:
```tsx
import pLimit from 'p-limit';

const limit = pLimit(4); // Run at most 4 tasks concurrently
const results = await Promise.all(urls.map(url => limit(() => fetch(url))));
```

---

## 4. 🛡️ Resilience, Observability & Error Safety

### `react-error-boundary` — Component Crash Protection
* **Superpower**: Prevents app-wide white screens by rendering localized fallback UI with recovery actions.
* **Usage**:
```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
      <p>Something went wrong: {error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// Wrap components:
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <ComplexMusicVisualizer />
</ErrorBoundary>
```

### `web-vitals` — Real-Time Core Web Vitals
* **Superpower**: Collect real-world user metrics (LCP, CLS, INP) directly from client sessions.
* **Usage**:
```tsx
import { onCLS, onFID, onLCP, onINP } from 'web-vitals';

if (typeof window !== 'undefined') {
  onCLS(console.log);
  onLCP(console.log);
  onINP(console.log);
}
```
