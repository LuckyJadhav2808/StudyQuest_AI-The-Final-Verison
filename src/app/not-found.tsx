import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="text-center max-w-md">
        {/* Pixel art styled 404 */}
        <div className="relative mb-6">
          <span className="text-[120px] font-heading font-black text-primary/10 leading-none select-none">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl animate-bounce" style={{ animationDuration: '2s' }}>🗺️</span>
          </div>
        </div>

        <h1 className="text-3xl font-heading font-black mb-3">
          Lost in the <span className="text-gradient">Dungeon</span>
        </h1>

        <p className="text-sm text-[var(--muted-foreground)] mb-8 leading-relaxed">
          This path doesn&apos;t lead anywhere, adventurer. The scroll you&apos;re looking for may have been moved or doesn&apos;t exist.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-heading font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
          >
            🏠 Return to Base Camp
          </Link>
          <Link
            href="/tasks"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-[var(--card-border)] bg-[var(--card-bg)] font-heading font-bold text-sm hover:border-primary/40 transition-all"
          >
            📋 View Quest Log
          </Link>
        </div>

        <p className="text-[10px] text-[var(--muted-foreground)] mt-10 uppercase tracking-widest font-bold">
          StudyQuest AI — Level Up Your Learning
        </p>
      </div>
    </div>
  );
}
