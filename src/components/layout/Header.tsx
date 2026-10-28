'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiSun, HiMoon, HiBell, HiSearch, HiSparkles,
} from 'react-icons/hi';
import { HiArrowsPointingOut, HiArrowsPointingIn } from 'react-icons/hi2';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/hooks/useGamification';
import { useFriends } from '@/hooks/useFriends';
import { useShop } from '@/hooks/useShop';
import { useFullscreen } from '@/hooks/useFullscreen';
import StreakCounter from '@/components/gamification/StreakCounter';
import LevelBadge from '@/components/gamification/LevelBadge';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const TreasureChestModal = dynamic(() => import('@/components/dashboard/TreasureChestModal'), {
  ssr: false,
});

// Time-of-day greeting generator
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  if (hour >= 17 && hour < 21) return { text: 'Good Evening', emoji: '🌆' };
  return { text: 'Night Owl Mode', emoji: '🌙' };
}

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { gamification } = useGamification();
  const { incomingRequests } = useFriends();
  const { coins, canClaimTreasureChest } = useShop();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();
  const [showChestModal, setShowChestModal] = useState(false);
  const router = useRouter();

  const chestAvailable = canClaimTreasureChest ? canClaimTreasureChest() : false;
  const greeting = getGreeting();

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <>
      <header className="flex-shrink-0 w-full flex items-center justify-between gap-2 sm:gap-3 py-1.5 sm:py-2 px-1 z-30 select-none">
        {/* Left Pill: StudyQuest Brand Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.div
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl sm:rounded-full bg-slate-900/90 dark:bg-white/[0.06] hover:bg-slate-800 dark:hover:bg-white/[0.1] border border-slate-700/80 dark:border-white/15 shadow-sm cursor-pointer transition-all group"
            title="StudyQuest Dashboard"
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-400 flex items-center justify-center text-white shadow-xs">
              <HiSparkles size={13} className="group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="text-xs sm:text-sm font-heading font-black tracking-wide text-white dark:text-slate-100 whitespace-nowrap">
              StudyQuest
            </span>
          </motion.div>

          {/* Quick Search Shortcut Pill (Desktop) */}
          <button
            onClick={openCommandPalette}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700/60 dark:border-white/10 bg-slate-900/60 dark:bg-white/[0.03] hover:border-violet-500/50 hover:bg-violet-500/5 text-[11px] text-slate-400 dark:text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Search or Ask Questie (Ctrl+K)"
          >
            <HiSearch size={12} />
            <span>Search...</span>
            <kbd className="px-1.5 py-0.2 rounded bg-slate-800 dark:bg-white/10 text-[9px] font-mono border border-slate-700 dark:border-white/10">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Center Area: Dynamic Greeting / Claimable Chest Pill */}
        <div className="flex-1 flex items-center justify-center min-w-0 max-w-xl mx-2">
          {chestAvailable ? (
            <motion.button
              onClick={() => setShowChestModal(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-2xl sm:rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 dark:text-amber-200 shadow-md shadow-amber-500/10 cursor-pointer animate-pulse transition-all"
              title="Click to claim your daily treasure chest!"
            >
              <span className="text-sm sm:text-base">🎁</span>
              <span className="text-[11px] sm:text-xs font-bold tracking-wide truncate">
                Daily Chest Ready — Claim Reward!
              </span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowChestModal(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-2xl sm:rounded-full bg-slate-900/70 dark:bg-white/[0.04] border border-slate-700/70 dark:border-white/10 text-slate-300 dark:text-slate-300 hover:border-violet-500/40 cursor-pointer transition-all shadow-xs truncate"
              title="Daily status and rewards"
            >
              <span className="text-xs sm:text-sm">{greeting.emoji}</span>
              <span className="text-[11px] sm:text-xs font-medium text-slate-300 dark:text-slate-200 truncate">
                {greeting.text}, Adventurer
              </span>
              <span className="hidden md:inline-block text-[10px] text-slate-400 dark:text-slate-400 font-normal">
                • Stay focused
              </span>
            </motion.div>
          )}
        </div>

        {/* Right Pill/Cluster: Streak, XP, Coins, Theme, Fullscreen, Notifications */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Status HUD Pill (Streak, Coins, XP) */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-slate-900/90 dark:bg-white/[0.05] border border-slate-700/80 dark:border-white/12 shadow-xs">
            {/* Streak Counter */}
            {gamification && (
              <StreakCounter streak={gamification.streak} size="sm" />
            )}

            <div className="h-3 w-[1px] bg-slate-700 dark:bg-white/15 hidden sm:block" />

            {/* Coins Balance */}
            <motion.button
              onClick={() => router.push('/shop')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
              title="Quest Coins (Click to visit Item Shop)"
            >
              <span className="text-xs">🪙</span>
              <span className="text-[11px] font-bold text-amber-400 font-mono tabular-nums">
                {typeof coins === 'number'
                  ? coins
                  : typeof coins === 'object' && coins && 'bc' in (coins as any)
                  ? Number((coins as any).bc) || 0
                  : 0}
              </span>
            </motion.button>

            <div className="h-3 w-[1px] bg-slate-700 dark:bg-white/15 hidden sm:block" />

            {/* XP / Level Indicator */}
            {gamification && (
              <motion.div
                onClick={() => router.push('/analytics')}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-400 dark:text-indigo-300 font-mono tabular-nums cursor-pointer"
                title={`Level ${gamification.level} (${gamification.xp?.toLocaleString() || 0} XP)`}
              >
                <span className="text-amber-400">⚡</span>
                <span className="hidden sm:inline">
                  {typeof gamification.xp === 'number' ? gamification.xp.toLocaleString() : '0'} XP
                </span>
                <span className="sm:hidden">
                  Lv.{gamification.level}
                </span>
              </motion.div>
            )}
          </div>

          {/* Action Button: Dark/Light Mode Toggle */}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/90 dark:bg-white/[0.05] hover:bg-slate-800 dark:hover:bg-white/[0.1] border border-slate-700/80 dark:border-white/12 flex items-center justify-center text-slate-300 dark:text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <HiSun size={15} /> : <HiMoon size={15} />}
          </motion.button>

          {/* Action Button: Fullscreen Toggle */}
          {isSupported && (
            <motion.button
              onClick={toggleFullscreen}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="hidden md:flex w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/90 dark:bg-white/[0.05] hover:bg-slate-800 dark:hover:bg-white/[0.1] border border-slate-700/80 dark:border-white/12 items-center justify-center text-slate-300 dark:text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
              title={isFullscreen ? 'Exit Immersion Mode' : 'Enter Immersion Mode'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <HiArrowsPointingIn size={15} /> : <HiArrowsPointingOut size={15} />}
            </motion.button>
          )}

          {/* Action Button: Notifications */}
          <motion.button
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/90 dark:bg-white/[0.05] hover:bg-slate-800 dark:hover:bg-white/[0.1] border border-slate-700/80 dark:border-white/12 flex items-center justify-center text-slate-300 dark:text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
            title="Notifications & Friends"
            aria-label="Notifications"
          >
            <HiBell size={15} />
            {incomingRequests.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center shadow-xs">
                {incomingRequests.length}
              </span>
            )}
          </motion.button>
        </div>
      </header>

      {/* Daily Treasure Chest Reward Modal */}
      {showChestModal && (
        <TreasureChestModal
          isOpen={showChestModal}
          onClose={() => setShowChestModal(false)}
        />
      )}
    </>
  );
}
