export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center">
        {/* Animated loading orb */}
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          <div className="absolute inset-0 flex items-center justify-center text-xl">⚡</div>
        </div>

        <p className="text-sm font-heading font-bold text-[var(--muted-foreground)] animate-pulse">
          Loading quest data...
        </p>
      </div>
    </div>
  );
}
