'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useTasks } from '@/hooks/useTasks';
import { getLevelProgress } from '@/lib/constants';
import { useTheme } from '@/context/ThemeContext';
import { playClick } from '@/lib/sounds';
import { HiSparkles } from 'react-icons/hi2';
import ExpressiveOwlMascot from './ExpressiveOwlMascot';

/* ============================================================
   Questie — Master Companion Mascot 🦉
   Engineered with mascot-character-companion, ui-ux-pro & design tokens
   Supports living animated (._.) face & 32-bit pixel art modes
   ============================================================ */

const ROUTE_DIALOGUES: Record<string, string[]> = {
  '/': [
    "Welcome back, adventurer! 🦉",
    "Your study deck awaits! 🚀",
    "Ready to earn some XP today? 💎",
    "Let's conquer your syllabus! ⚔️",
  ],
  '/tasks': [
    "Let's slay those quests! ⚔️",
    "One quest at a time, scholar! 📋",
    "Every task completed unlocks XP! ✨",
    "What's the top priority today? 🎯",
  ],
  '/notes': [
    "Capture those insights! 📜",
    "Writing by hand reinforces memory! ✍️",
    "The pen is mightier than the sword! 📝",
    "Your digital grimoire is growing! 📖",
  ],
  '/habits': [
    "Daily habits build legends! ⚡",
    "Protect that flame streak! 🔥",
    "Small daily quests, massive results! ⚡",
    "Consistency is your greatest superpower! 💪",
  ],
  '/timer': [
    "Shh... deep work mode active! 🤫",
    "Laser focus time. You've got this! ⏰",
    "Clear mind, zero distractions! 🧘",
    "Flow state engaged! Let's build! 🚀",
  ],
  '/timetable': [
    "A well-planned week is half won! 📅",
    "Structure breeds academic freedom! 🗓️",
    "What's on the radar today? 📅",
  ],
  '/resources': [
    "The vault of high-yield knowledge! 📚",
    "Curated formulas and cheatsheets! 🔗",
    "Study smarter, not harder! 💡",
  ],
  '/chat': [
    "I'm here for wisdom, tips & banter! 💬",
    "Ask me about any tricky concept! 🤖",
    "Brainstorming together is fun! 🦉",
  ],
  '/analytics': [
    "Behold your study telemetry! 📊",
    "The Hall of Fame is calling your name! 🏆",
    "Data reveals your true dedication! 📈",
  ],
  '/groups': [
    "Study together, level up faster! 👥",
    "The study guild stands strong! 🤝",
    "Peer accountability is magic! ✨",
  ],
  '/dsa': [
    "Algorithms are just puzzles in disguise! 🧩",
    "Enter the DSA dungeon and conquer! 🏰",
    "Think, dry run, code, optimize! 💡",
  ],
  '/code': [
    "Time to write some rapid code spells! 💻",
    "Run tests and iterate quickly! ⚡",
    "Bug fixing is just detective work! 🔍",
  ],
  '/ide': [
    "The developer forge is ready! 🪄",
    "Building full-stack mastery! 🏗️",
    "Clean architecture always wins! 💻",
  ],
  '/pets': [
    "Treat your study companions well! 🐾",
    "Companions evolve with your dedication! 🌟",
    "Don't forget to feed your buddy! 🍪",
  ],
  '/settings': [
    "Fine-tune your study environment! ⚙️",
    "Make StudyQuest feel like home! 🔧",
    "Configure audio, theme and presets! 🎨",
  ],
};

const IDLE_MESSAGES = [
  "*yawns softly* ...still at your desk? 💤",
  "Zzz... Questie is recharging wisdom... 😴",
  "*preening feathers peacefully* 🦉",
  "Ready for a study sprint when you are! ✨",
];

const RETURN_MESSAGES = [
  "You're back! Let's continue the quest! 🦉",
  "Welcome back, scholar! Momentum restored! 🎉",
  "Rest was good! Now let's conquer! ⚡",
  "Ready to earn more XP? Let's go! 🚀",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type MascotMood = 'active' | 'focus' | 'celebration' | 'night-owl' | 'sleeping';
export type MascotVisualMode = 'expressive' | 'pixel';

interface QuestieMascotProps {
  collapsed?: boolean;
}

export default function QuestieMascot({ collapsed = false }: QuestieMascotProps) {
  const pathname = usePathname();
  const { reduceMotion } = useTheme();
  const [dialogue, setDialogue] = useState('Ready for a quest? 🦉');
  const [mood, setMood] = useState<MascotMood>('active');
  const [showDialogue, setShowDialogue] = useState(true);
  const [squishing, setSquishing] = useState(false);
  const [collapsedPopoverOpen, setCollapsedPopoverOpen] = useState(false);
  const [mascotStyle, setMascotStyle] = useState<MascotVisualMode>('expressive');

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());
  const wasIdleRef = useRef(false);

  const { gamification } = useGamification();
  const { tasks } = useTasks();

  // Load user's preferred mascot style (defaults to expressive ._.)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sq_questie_style');
      if (saved === 'pixel' || saved === 'expressive') {
        setMascotStyle(saved);
      }
    } catch {}
  }, []);

  const toggleMascotStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClick();
    setMascotStyle((prev) => {
      const next = prev === 'expressive' ? 'pixel' : 'expressive';
      try {
        localStorage.setItem('sq_questie_style', next);
      } catch {}
      return next;
    });
  };

  // ── Context-aware dynamic dialogue generator ─────────────────
  const getContextDialogues = useCallback(() => {
    const customLines: string[] = [];
    const todayStr = new Date().toDateString();
    const hour = new Date().getHours();

    // 1. Night Owl Hours (9 PM - 5 AM)
    const isLateNight = hour >= 21 || hour < 5;
    if (isLateNight) {
      customLines.push(
        "Night Owl Mode active! Burning midnight wisdom! 🌙",
        "Late study sessions require plenty of water! 💧",
        "The quiet midnight hours yield deep focus... ✨"
      );
    }

    // 2. Overdue or pending high-priority tasks
    if (tasks && tasks.length > 0) {
      const hasOverdue = tasks.some((t) => {
        if (t.status === 'done' || !t.dueDate) return false;
        const dueDateObj = new Date(t.dueDate);
        return dueDateObj.getTime() < Date.now() && dueDateObj.toDateString() !== todayStr;
      });
      if (hasOverdue) {
        customLines.push(
          "Let's slay that pending urgent quest today! ⚔️",
          "Unfinished scrolls in your quest log! Let's clear them! 📜",
          "Adventure waits for no one! Review your tasks! 📋"
        );
      }
    }

    // 3. Level-up progress
    if (gamification) {
      const progress = getLevelProgress(gamification.xp);
      if (progress >= 0.8) {
        customLines.push(
          "You're right on the verge of leveling up! 🏆",
          "Just a few more quests to your next rank! ⚡",
          "Smells like victory and level up XP! Keep grinding! 🎉"
        );
      }

      // 4. Streak celebrations
      if (gamification.streak && gamification.streak >= 3) {
        customLines.push(
          `Your ${gamification.streak}-day streak is blazing hot! 🔥`,
          `Unstoppable momentum! Streak multiplier active! ⚡`
        );
      }
    }

    return customLines;
  }, [tasks, gamification]);

  // ── Calculate dynamic emotional state ────────────────────────
  const currentMood: MascotMood = useMemo(() => {
    if (mood === 'sleeping') return 'sleeping';
    if (pathname === '/timer') return 'focus';
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 5) return 'night-owl';
    if (gamification && (gamification.streak >= 3 || getLevelProgress(gamification.xp) >= 0.8)) {
      return 'celebration';
    }
    return 'active';
  }, [mood, pathname, gamification]);

  // ── Update dialogue on route change ──────────────────────────
  useEffect(() => {
    const routeMessages = ROUTE_DIALOGUES[pathname] || ROUTE_DIALOGUES['/'] || [];
    const contextMessages = getContextDialogues();

    let candidates = [...routeMessages];
    if (contextMessages.length > 0) {
      candidates = Math.random() < 0.65 ? [...contextMessages] : [...candidates, ...contextMessages];
    }

    if (candidates.length > 0) {
      setDialogue(pickRandom(candidates));
      setMood('active');
      setShowDialogue(true);
      wasIdleRef.current = false;
      lastActivityRef.current = Date.now();
    }
  }, [pathname, getContextDialogues]);

  // ── Idle detection ───────────────────────────────────────────
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (wasIdleRef.current) {
        wasIdleRef.current = false;
        setMood('active');
        setDialogue(pickRandom(RETURN_MESSAGES));
        setShowDialogue(true);
      }
    };

    const checkIdle = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > 120000 && !wasIdleRef.current) {
        wasIdleRef.current = true;
        setMood('sleeping');
        setDialogue(pickRandom(IDLE_MESSAGES));
        setShowDialogue(true);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    idleTimerRef.current = setInterval(checkIdle, 10000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, []);

  // ── Interactive click / squish reaction ──────────────────────
  const handleMascotClick = () => {
    playClick();
    setSquishing(true);
    setTimeout(() => setSquishing(false), 650);

    const routeMessages = ROUTE_DIALOGUES[pathname] || ROUTE_DIALOGUES['/'] || [];
    const contextMessages = getContextDialogues();
    const pool = [...routeMessages, ...contextMessages];
    setDialogue(pickRandom(pool.length > 0 ? pool : ['Consistency is your greatest superpower! ✨']));
    setShowDialogue(true);
    setMood('active');
    setCollapsedPopoverOpen((prev) => !prev);
  };

  // ── Aura colors based on mood ────────────────────────────────
  const auraGlow = useMemo(() => {
    switch (currentMood) {
      case 'focus':
        return 'bg-emerald-500/25 blur-md';
      case 'celebration':
        return 'bg-amber-400/30 blur-md';
      case 'night-owl':
        return 'bg-violet-600/30 blur-md';
      case 'sleeping':
        return 'bg-blue-500/15 blur-sm';
      default:
        return 'bg-indigo-500/20 blur-md';
    }
  }, [currentMood]);

  // ============================================================
  // COLLAPSED SIDEBAR VIEW
  // ============================================================
  if (collapsed) {
    return (
      <div className="relative flex justify-center py-1">
        <motion.div
          onClick={handleMascotClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={squishing ? { scale: [1, 0.85, 1.18, 1] } : { y: [0, -3, 0] }}
          transition={
            squishing
              ? { duration: 0.35 }
              : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          }
          className="relative cursor-pointer group flex items-center justify-center p-1.5 rounded-2xl bg-slate-900/60 dark:bg-slate-950/80 border border-white/10 hover:border-indigo-500/40 shadow-md transition-colors"
          title="Click Questie for wisdom!"
        >
          {/* Ambient Glow */}
          <div className={`absolute inset-0 rounded-2xl ${auraGlow} pointer-events-none`} />

          {mascotStyle === 'expressive' ? (
            <ExpressiveOwlMascot
              mood={currentMood}
              isSquishing={squishing}
              size={34}
            />
          ) : (
            <img
              src="/questie_remake.png"
              alt="Questie"
              className="w-8 h-8 object-contain relative z-10 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
              style={{ imageRendering: 'pixelated' }}
            />
          )}

          {/* Status Indicator */}
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 shadow-sm" />
        </motion.div>

        {/* Collapsed Hover / Click Popover */}
        <AnimatePresence>
          {collapsedPopoverOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="absolute left-14 top-0 z-50 w-52 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 border border-indigo-500/30 shadow-2xl backdrop-blur-xl text-left"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs">🦉</span>
                <span className="text-[10px] font-bold font-heading uppercase text-indigo-300">
                  Questie's Wisdom
                </span>
              </div>
              <p className="text-xs font-medium text-slate-200 leading-snug">{dialogue}</p>
              <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>Tap for next tip</span>
                <span>✨</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================================
  // EXPANDED SIDEBAR VIEW
  // ============================================================
  return (
    <div className="relative py-1 select-none">
      {/* Container Card */}
      <div className="relative overflow-hidden rounded-2xl p-3 bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-purple-950/30 dark:from-indigo-950/40 dark:via-slate-950/70 dark:to-purple-950/40 border border-white/10 hover:border-indigo-500/30 transition-all shadow-md group">
        {/* Ambient Mood Glow */}
        <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${auraGlow} pointer-events-none opacity-60`} />

        <div className="relative z-10 flex items-center gap-3">
          {/* Clickable Animated Mascot Sprite */}
          <motion.div
            onClick={handleMascotClick}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            animate={
              squishing
                ? { scale: [1, 0.88, 1.16, 1] }
                : reduceMotion
                ? {}
                : currentMood === 'celebration'
                ? { y: [0, -6, 0], scale: [1, 1.06, 1] }
                : currentMood === 'sleeping'
                ? { y: [0, 2, 0] }
                : { y: [0, -4, 0] }
            }
            transition={
              squishing
                ? { duration: 0.35 }
                : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
            }
            className="relative cursor-pointer shrink-0"
            title="Click Questie for wisdom!"
          >
            {mascotStyle === 'expressive' ? (
              <ExpressiveOwlMascot
                mood={currentMood}
                isSquishing={squishing}
                size={50}
              />
            ) : (
              <>
                {/* Ground Shadow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full bg-black/40 blur-[2px]" />

                <img
                  src="/questie_remake.png"
                  alt="Questie"
                  className="w-12 h-12 object-contain relative z-10 filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]"
                  style={{ imageRendering: 'pixelated' }}
                />

                {/* Zzz particle when sleeping */}
                {currentMood === 'sleeping' && (
                  <motion.span
                    className="absolute -top-1.5 -right-1 text-[10px] font-bold text-indigo-300 pointer-events-none z-20"
                    animate={{ opacity: [0, 1, 0], y: [0, -8], x: [0, 4] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  >
                    zZ
                  </motion.span>
                )}
              </>
            )}
          </motion.div>

          {/* Speech Text & Interactive Tip */}
          <div className="flex-1 min-w-0" onClick={handleMascotClick}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-heading font-black uppercase tracking-wider text-indigo-400 dark:text-indigo-300 flex items-center gap-1">
                <HiSparkles size={11} /> Questie
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/25">
                {currentMood === 'focus'
                  ? 'Focus'
                  : currentMood === 'night-owl'
                  ? 'Night Owl'
                  : currentMood === 'celebration'
                  ? 'On Fire 🔥'
                  : 'Companion'}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={dialogue}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-medium text-slate-200 dark:text-slate-300 leading-snug line-clamp-2 cursor-pointer hover:text-white transition-colors"
                title="Click for next wisdom quote"
              >
                {dialogue}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Tactile hint and style switcher in footer */}
        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400 font-mono">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <span>💡</span> Tap for tip
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMascotStyle}
              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-indigo-200 border border-white/10 transition-colors flex items-center gap-1 cursor-pointer"
              title="Toggle between Expressive (._.) and Pixel Art"
            >
              <span>{mascotStyle === 'expressive' ? '🦉 (._.)' : '🎨 Pixel'}</span>
            </button>
            <span className="text-indigo-400 font-bold">v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
