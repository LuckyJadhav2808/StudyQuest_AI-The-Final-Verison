'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

/* ============================================================
   Questie — The Animated StudyQuest Mascot 🦉
   Features:
   • Context-aware dialogue based on current route
   • Idle animations: blinking, looking around, sleeping
   • Reacts when user returns from idle
   ============================================================ */

// ── Route-specific dialogue lines ──────────────────────────────
const ROUTE_DIALOGUES: Record<string, string[]> = {
  '/': [
    "🦉 Welcome back, adventurer!",
    "🦉 Your dashboard awaits!",
    "🦉 Ready to level up today?",
    "🦉 Let's conquer some quests!",
  ],
  '/tasks': [
    "⚔️ Let's check off those quests!",
    "📋 Focus on one quest at a time!",
    "⚔️ Every task slain = XP gained!",
    "🎯 What's the priority today?",
  ],
  '/notes': [
    "📜 Time to write some scrolls!",
    "✍️ Knowledge is power, write it down!",
    "📝 The pen is mightier...",
    "📜 Capture those ideas!",
  ],
  '/habits': [
    "⚡ Daily quests keep you sharp!",
    "🔥 Don't break the streak!",
    "⚡ Small habits, big results!",
    "💪 Consistency is your superpower!",
  ],
  '/timer': [
    "🤫 Shh... Focus mode engaged!",
    "⏰ Deep work time. You got this!",
    "🧘 Clear mind, sharp focus...",
    "🤫 No distractions. Let's go!",
  ],
  '/timetable': [
    "📅 Planning is half the battle!",
    "🗓️ A good schedule = a good life!",
    "📅 What's on the agenda?",
  ],
  '/resources': [
    "📚 The vault of knowledge...",
    "🔗 Save it now, thank yourself later!",
    "📚 Organize and conquer!",
  ],
  '/chat': [
    "💬 Ask me anything!",
    "🤖 I'm here to help you learn!",
    "💬 Let's chat and grow!",
  ],
  '/analytics': [
    "📊 Behold your achievements!",
    "🏆 The Hall of Fame awaits!",
    "📊 Data doesn't lie. You're awesome!",
  ],
  '/groups': [
    "👥 Study together, grow together!",
    "🤝 The guild is assembled!",
    "👥 Teamwork makes the dream work!",
  ],
  '/sql': [
    "🗃️ SELECT * FROM knowledge;",
    "💾 Database magic awaits!",
    "🗃️ Let's query some data!",
  ],
  '/code': [
    "💻 Time to write some spells!",
    "⚡ Quick run. Rapid fire!",
    "💻 Code fast, learn faster!",
  ],
  '/ide': [
    "🪄 Let's cast some code magic!",
    "🏗️ Building something amazing?",
    "🪄 The forge is hot. Let's build!",
  ],
  '/dsa': [
    "🧩 Algorithms are puzzles. Solve them!",
    "🏰 Enter the DSA Dungeon!",
    "🧩 Think. Code. Optimize. Repeat.",
  ],
  '/snippets': [
    "📖 Your spell book of code!",
    "✨ Saved spells at the ready!",
    "📖 Reuse and conquer!",
  ],
  '/settings': [
    "⚙️ Tweaking the controls?",
    "🔧 Make StudyQuest yours!",
    "⚙️ Customization is key!",
  ],
};

const IDLE_MESSAGES = [
  "💤 *yawns* ...still there?",
  "😴 Zzz... wake me when you're back...",
  "💤 *snoring softly*",
  "🦉 ...*blinks sleepily*...",
];

const RETURN_MESSAGES = [
  "🦉 Oh! You're back! Let's go!",
  "🎉 Welcome back, adventurer!",
  "🦉 Missed you! Ready to study?",
  "⚡ Recharged? Let's do this!",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Mascot states ──────────────────────────────────────────────
type MascotState = 'active' | 'blinking' | 'looking' | 'sleeping';

interface QuestieMascotProps {
  collapsed?: boolean;
}

export default function QuestieMascot({ collapsed = false }: QuestieMascotProps) {
  const pathname = usePathname();
  const [dialogue, setDialogue] = useState('🦉 Ready for a quest?');
  const [mascotState, setMascotState] = useState<MascotState>('active');
  const [showDialogue, setShowDialogue] = useState(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lookTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef(Date.now());
  const wasIdleRef = useRef(false);

  // ── Update dialogue when route changes ───────────────────────
  useEffect(() => {
    const messages = ROUTE_DIALOGUES[pathname] || ROUTE_DIALOGUES['/'] || [];
    if (messages.length > 0) {
      setDialogue(pickRandom(messages));
      setMascotState('active');
      setShowDialogue(true);
      wasIdleRef.current = false;
      lastActivityRef.current = Date.now();
    }
  }, [pathname]);

  // ── Blink animation (every 3-6 seconds) ─────────────────────
  const startBlinkCycle = useCallback(() => {
    const schedule = () => {
      const delay = 3000 + Math.random() * 3000;
      blinkTimerRef.current = setTimeout(() => {
        if (mascotState !== 'sleeping') {
          setMascotState('blinking');
          setTimeout(() => {
            setMascotState((prev) => (prev === 'blinking' ? 'active' : prev));
          }, 200);
        }
        schedule();
      }, delay);
    };
    schedule();
  }, [mascotState]);

  useEffect(() => {
    startBlinkCycle();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [startBlinkCycle]);

  // ── Look-around animation (every 8-15 seconds) ──────────────
  useEffect(() => {
    const schedule = () => {
      const delay = 8000 + Math.random() * 7000;
      lookTimerRef.current = setTimeout(() => {
        if (mascotState === 'active') {
          setMascotState('looking');
          setTimeout(() => {
            setMascotState((prev) => (prev === 'looking' ? 'active' : prev));
          }, 1500);
        }
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (lookTimerRef.current) clearTimeout(lookTimerRef.current);
    };
  }, [mascotState]);

  // ── Idle / sleep detection (after 2 minutes of no interaction)
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();

      if (wasIdleRef.current) {
        wasIdleRef.current = false;
        setMascotState('active');
        setDialogue(pickRandom(RETURN_MESSAGES));
        setShowDialogue(true);
      }
    };

    const checkIdle = () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > 120000 && !wasIdleRef.current) {
        // 2 minutes idle
        wasIdleRef.current = true;
        setMascotState('sleeping');
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

  // ── Mascot eye rendering ─────────────────────────────────────
  const getEyes = () => {
    switch (mascotState) {
      case 'blinking':
        return '— —';
      case 'sleeping':
        return '✖ ✖';
      case 'looking':
        return '◑ ◐';
      default:
        return '● ●';
    }
  };

  return (
    <div className="relative">
      {/* Mascot avatar */}
      <motion.div
        className="relative w-10 h-10 flex-shrink-0 cursor-pointer select-none"
        onClick={() => {
          const messages = ROUTE_DIALOGUES[pathname] || ROUTE_DIALOGUES['/'] || [];
          setDialogue(pickRandom(messages));
          setShowDialogue(true);
          setMascotState('active');
        }}
        animate={
          mascotState === 'sleeping'
            ? { rotate: [0, -5, 0, -5, 0], y: [0, 2, 0] }
            : mascotState === 'looking'
            ? { rotate: [0, -8, 8, 0] }
            : { rotate: 0, y: 0 }
        }
        transition={
          mascotState === 'sleeping'
            ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            : mascotState === 'looking'
            ? { duration: 1.5, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
        whileHover={{ scale: 1.15, rotate: [0, -10, 10, 0] }}
        whileTap={{ scale: 0.9 }}
      >
        {/* Owl body */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber to-amber-dark flex items-center justify-center relative overflow-hidden shadow-[0_3px_0_rgba(0,0,0,0.2)]">
          {/* Eyes */}
          <motion.div
            className="text-[8px] font-bold text-[#2D1B00] tracking-wider absolute top-2.5"
            animate={mascotState === 'blinking' ? { scaleY: [1, 0.1, 1] } : { scaleY: 1 }}
            transition={{ duration: 0.15 }}
          >
            {getEyes()}
          </motion.div>
          {/* Beak */}
          <div className="absolute bottom-2 text-[7px]">▼</div>

          {/* Sleep Zzz particles */}
          <AnimatePresence>
            {mascotState === 'sleeping' && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute text-[8px] font-bold text-primary"
                    initial={{ opacity: 0, x: 14, y: 0, scale: 0.5 }}
                    animate={{
                      opacity: [0, 1, 0],
                      x: [14, 18 + i * 3],
                      y: [-2, -12 - i * 6],
                      scale: [0.5, 0.8 + i * 0.2],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.6,
                      ease: 'easeOut',
                    }}
                  >
                    z
                  </motion.span>
                ))}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Active glow ring */}
        {mascotState === 'active' && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </motion.div>

      {/* Speech bubble (only when sidebar expanded) */}
      <AnimatePresence>
        {!collapsed && showDialogue && (
          <motion.div
            className="absolute left-12 top-0 z-50 min-w-[180px] max-w-[200px]"
            initial={{ opacity: 0, x: -8, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="speech-bubble text-[11px] leading-relaxed">
              {dialogue}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
