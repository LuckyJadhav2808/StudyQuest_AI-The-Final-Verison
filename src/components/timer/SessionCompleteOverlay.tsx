'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import { SessionCompleteData } from '@/context/TimerContext';

interface SessionCompleteOverlayProps {
  data: SessionCompleteData;
  onDismiss: () => void;
}

/* ---------- tiny confetti particles ---------- */
const PARTICLE_COLORS = ['#fbbf24', '#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fb923c'];

function Particles() {
  const [particles] = useState(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 4 + Math.random() * 6,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      delay: Math.random() * 1.2,
      duration: 2 + Math.random() * 2,
    }))
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: `${p.x}%`, width: p.size, height: p.size, background: p.color }}
          initial={{ y: '-10%', opacity: 1, rotate: 0 }}
          animate={{ y: '110vh', opacity: 0, rotate: 360 }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

/* ---------- counting number ---------- */
function CountUp({ target, duration = 1.2 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const steps = 30;
    const inc = target / steps;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setVal(step >= steps ? target : Math.round(inc * step));
      if (step >= steps) clearInterval(id);
    }, (duration * 1000) / steps);
    return () => clearInterval(id);
  }, [target, duration]);
  return <>{val}</>;
}

/* ---------- progress ring ---------- */
function ProgressRing({ count }: { count: number }) {
  const pct = Math.min((count % 4 || 4) / 4, 1);
  const r = 28, circ = 2 * Math.PI * r;

  return (
    <svg width={72} height={72} className="mx-auto">
      <circle cx={36} cy={36} r={r} fill="none" stroke="var(--card-border)" strokeWidth={5} />
      <motion.circle
        cx={36} cy={36} r={r} fill="none"
        stroke="url(#grad)" strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ transformOrigin: 'center', rotate: '-90deg' }}
      />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <text x="50%" y="54%" textAnchor="middle" fill="var(--foreground)" fontSize={14} fontWeight="bold">
        {count % 4 || 4}/4
      </text>
    </svg>
  );
}

/* ---------- main overlay ---------- */
export default function SessionCompleteOverlay({ data, onDismiss }: SessionCompleteOverlayProps) {
  const { xpEarned, coinsEarned, sessionCount, ingredientDrop, isLongBreak } = data;
  const [hovered, setHovered] = useState(false);

  /* auto-dismiss */
  useEffect(() => {
    if (hovered) return;
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss, hovered]);

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Particles />

        <motion.div
          className="relative z-10 mx-4 w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl"
          style={{
            background: 'rgba(var(--card-bg-rgb, 30 30 46), 0.92)',
            borderColor: 'var(--card-border)',
            backdropFilter: 'blur(24px)',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          initial={{ scale: 0.6, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        >
          {/* celebration emoji */}
          <motion.div
            className="mb-2 text-5xl"
            animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1 }}
          >
            {isLongBreak ? '✨' : '🍅'}
          </motion.div>

          <h2 className="font-heading text-xl font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent">
            {isLongBreak ? '4-Session Milestone!' : 'Session Complete!'}
          </h2>

          {/* rewards */}
          <div className="mt-4 flex items-center justify-center gap-6 text-lg font-semibold">
            <span className="flex items-center gap-1">
              ⭐ +<CountUp target={xpEarned} /> XP
            </span>
            <span className="flex items-center gap-1">
              🪙 +<CountUp target={coinsEarned} /> Coins
            </span>
          </div>

          {/* ingredient drop */}
          {ingredientDrop && (
            <motion.div
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <motion.span
                className="text-2xl"
                animate={{ filter: ['drop-shadow(0 0 4px #fbbf24)', 'drop-shadow(0 0 12px #a78bfa)', 'drop-shadow(0 0 4px #fbbf24)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {ingredientDrop.emoji}
              </motion.span>
              Found: {ingredientDrop.name}!
            </motion.div>
          )}

          {/* progress ring + session count */}
          <div className="mt-4 space-y-1">
            <ProgressRing count={sessionCount} />
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Session {sessionCount} today
            </p>
          </div>

          {/* continue */}
          <div className="mt-5">
            <Button variant="primary" size="md" fullWidth onClick={onDismiss}>
              Continue
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
