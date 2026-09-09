'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playClick } from '@/lib/sounds';
import { HiSparkles, HiChatBubbleOvalLeftEllipsis } from 'react-icons/hi2';
import ExpressiveOwlMascot from '@/components/gamification/ExpressiveOwlMascot';

interface DashboardHeroMascotProps {
  displayName?: string;
  streak?: number;
  todayCompleted?: number;
  todayTotal?: number;
  timeOfDayGreeting?: string;
}

const WISDOM_TIPS = [
  "Tip: The Feynman Technique — explain a concept simply to test true mastery! 💡",
  "Tip: 25-minute Pomodoro sprints prevent cognitive fatigue! ⏱️",
  "Tip: Active recall beats passive reading every single time! 🧠",
  "Tip: Solving 2 DSA problems daily builds compound intuition! ⚔️",
  "Tip: Drink water and take deep breaths between study blocks! 💧",
  "Tip: Protect your daily streak — consistency is your greatest power! 🔥",
  "Tip: Review your toughest notes right before sleep for memory consolidation! 🌙",
];

export default function DashboardHeroMascot({
  displayName = 'Adventurer',
  streak = 0,
  todayCompleted = 0,
  todayTotal = 0,
  timeOfDayGreeting = 'Welcome',
}: DashboardHeroMascotProps) {
  const [squishing, setSquishing] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [showBubble, setShowBubble] = useState(true);

  // Dynamic context-based greeting speech
  const defaultSpeech = useMemo(() => {
    const hour = new Date().getHours();
    const firstName = displayName.split(' ')[0] || 'Scholar';

    if (hour >= 21 || hour < 5) {
      return `Night owl mode, ${firstName}! The quiet hours forge true mastery 🌙`;
    }
    if (todayTotal > 0 && todayCompleted >= todayTotal) {
      return `Quest log complete today, ${firstName}! Outstanding discipline! 👑`;
    }
    if (todayCompleted > 0) {
      return `${todayCompleted} of ${todayTotal} quests down! Keep this momentum burning! 🔥`;
    }
    if (streak > 0) {
      return `Protect your ${streak}-day flame today! Slay that first quest! ⚔️`;
    }
    return `Welcome to the Command Deck, ${firstName}! Ready to conquer? ✨`;
  }, [displayName, streak, todayCompleted, todayTotal]);

  const currentSpeech = tipIndex === 0 ? defaultSpeech : WISDOM_TIPS[(tipIndex - 1) % WISDOM_TIPS.length];

  const handleMascotClick = () => {
    playClick();
    setSquishing(true);
    setTipIndex((prev) => prev + 1);
    setShowBubble(true);
    setTimeout(() => setSquishing(false), 650);
  };

  return (
    <div className="relative flex items-center gap-3 select-none">
      {/* Dynamic Speech Bubble */}
      <AnimatePresence mode="wait">
        {showBubble && (
          <motion.div
            key={currentSpeech}
            initial={{ opacity: 0, x: -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="hidden md:flex relative items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-indigo-500/30 shadow-[0_8px_20px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.5)] backdrop-blur-xl text-left max-w-[260px] xl:max-w-[320px] cursor-pointer"
            onClick={handleMascotClick}
            title="Click for next tip"
          >
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] font-bold font-heading uppercase text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                  <HiSparkles size={11} /> Questie Co-Pilot
                </span>
                <span className="text-[9px] text-slate-400 font-mono">• Tap tip</span>
              </div>
              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 leading-snug">
                {currentSpeech}
              </p>
            </div>
            {/* Bubble Tail Arrow pointing RIGHT to Questie */}
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white/90 dark:bg-slate-900/90 border-t border-r border-indigo-500/30 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clickable Floating Questie Hero Companion Sprite */}
      <motion.div
        onClick={handleMascotClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.88 }}
        animate={
          squishing
            ? { scale: [1, 0.85, 1.2, 1] }
            : { y: [0, -6, 0] }
        }
        transition={
          squishing
            ? { duration: 0.35 }
            : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
        }
        className="relative cursor-pointer group flex items-center justify-center min-w-[56px] min-h-[56px]"
        title="Questie • Tap for study wisdom!"
      >
        {/* Ambient Luminescence Glow Disk */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-xl scale-125 group-hover:scale-150 transition-transform pointer-events-none" />

        {/* Expressive Living Chibi Mascot with Blinking (._.) Eyes */}
        <ExpressiveOwlMascot
          mood={
            new Date().getHours() >= 21 || new Date().getHours() < 5
              ? 'night-owl'
              : todayTotal > 0 && todayCompleted >= todayTotal
              ? 'celebration'
              : 'active'
          }
          isSquishing={squishing}
          size={58}
        />
      </motion.div>
    </div>
  );
}
