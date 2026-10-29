'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HiSun, HiMoon, HiBell, HiSearch, HiSparkles, HiLightningBolt
} from 'react-icons/hi';
import { HiArrowsPointingOut, HiArrowsPointingIn } from 'react-icons/hi2';
import { useTheme } from '@/context/ThemeContext';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useFriends } from '@/hooks/useFriends';
import { useShop } from '@/hooks/useShop';
import { useFullscreen } from '@/hooks/useFullscreen';
import StreakCounter from '@/components/gamification/StreakCounter';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const TreasureChestModal = dynamic(() => import('@/components/dashboard/TreasureChestModal'), {
  ssr: false,
});

// Clean SVG Coin Icon
function CoinIcon({ className = 'w-3.5 h-3.5 text-amber-500' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12" />
      <path d="M15 9.5a2.5 2.5 0 0 0-5 0c0 2.5 5 1.5 5 4a2.5 2.5 0 0 1-5 0" />
    </svg>
  );
}

// Time-of-day greeting generator
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: 'Good Morning', icon: HiSun, iconColor: 'text-amber-500' };
  if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', icon: HiSun, iconColor: 'text-amber-400' };
  if (hour >= 17 && hour < 21) return { text: 'Good Evening', icon: HiMoon, iconColor: 'text-indigo-400' };
  return { text: 'Night Owl Mode', icon: HiMoon, iconColor: 'text-violet-400' };
}

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuthContext();
  const { gamification } = useGamification();
  const { incomingRequests } = useFriends();
  const { coins, canClaimTreasureChest } = useShop();
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen();
  const [showChestModal, setShowChestModal] = useState(false);
  const router = useRouter();

  const username =
    profile?.displayName?.trim()?.split(' ')[0] ||
    user?.displayName?.trim()?.split(' ')[0] ||
    (user?.email ? user.email.split('@')[0] : 'Scholar');

  const chestAvailable = canClaimTreasureChest ? canClaimTreasureChest() : false;
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <>
      <header className="flex-shrink-0 w-full flex items-center justify-between gap-1.5 sm:gap-2.5 py-0.5 px-0.5 h-10 sm:h-11 z-30 select-none">
        {/* ============================================================
            BAY 1: BRAND ANCHOR PILL (LEFT)
            ============================================================ */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-full bg-white/80 dark:bg-[#111328]/75 backdrop-blur-xl border-2 border-indigo-200/90 dark:border-white/14 shadow-[0_4px_16px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.25)]">
            <motion.div
              onClick={() => router.push('/')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full hover:bg-indigo-50/60 dark:hover:bg-white/[0.08] cursor-pointer transition-all group"
              title="StudyQuest Dashboard"
            >
              <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-md bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-2xs">
                <HiSparkles size={11} className="group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <span className="text-xs font-heading font-black tracking-wide text-gradient whitespace-nowrap">
                StudyQuest
              </span>
            </motion.div>

            {/* Quick Search Shortcut Pill */}
            <button
              onClick={openCommandPalette}
              className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-white/10 bg-indigo-50/50 dark:bg-white/[0.04] hover:border-primary/50 hover:bg-primary/5 text-[10px] text-[var(--muted-foreground)] hover:text-primary transition-all cursor-pointer shadow-2xs mr-0.5"
              title="Search or Ask Questie (Ctrl+K)"
            >
              <HiSearch size={11} className="text-primary/70" />
              <span>Search</span>
              <kbd className="px-1 py-0.2 rounded bg-white dark:bg-white/10 text-[8px] font-mono border border-indigo-100 dark:border-white/10 text-[var(--muted-foreground)]">
                Ctrl+K
              </kbd>
            </button>
          </div>
        </div>

        {/* ============================================================
            BAY 2: DYNAMIC SANCTUARY & DAILY CHEST BAY (CENTER)
            ============================================================ */}
        <div className="flex-1 flex items-center justify-center min-w-0 max-w-lg mx-1.5">
          {chestAvailable ? (
            <motion.button
              onClick={() => setShowChestModal(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-primary/20 to-secondary/20 hover:from-amber-500/30 hover:to-secondary/30 border-2 border-amber-400/40 text-amber-700 dark:text-amber-200 shadow-xs cursor-pointer animate-pulse transition-all"
              title="Click to claim your daily treasure chest"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-500">
                <HiSparkles size={10} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-wide truncate">
                Daily Chest Ready — Claim Reward
              </span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowChestModal(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1 rounded-full bg-white dark:bg-[#111328] border-2 border-indigo-200/90 dark:border-white/12 text-slate-700 dark:text-slate-200 hover:border-primary/40 cursor-pointer transition-all shadow-xs truncate"
              title="Daily status and rewards"
            >
              <GreetingIcon size={12} className={greeting.iconColor} />
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                {greeting.text}, {username}
              </span>
              <span className="hidden md:inline-block text-[9px] text-[var(--muted-foreground)] font-normal">
                • Stay focused
              </span>
            </motion.div>
          )}
        </div>

        {/* ============================================================
            BAY 3: UNIFIED COCKPIT CONTROL TRAY (RIGHT)
            Sculpted outer tray enclosing HUD pill and circular action buttons
            ============================================================ */}
        <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-full bg-indigo-50/70 dark:bg-[#161838]/70 backdrop-blur-xl border-2 border-indigo-200/90 dark:border-white/14 shadow-[0_4px_16px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.25)] flex-shrink-0">
          {/* Elongated Status HUD Inner Pill (Streak, Coins, XP) */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-[#111328]/85 backdrop-blur-md border border-indigo-100 dark:border-white/10 shadow-2xs">
            {/* Streak Counter */}
            {gamification && (
              <StreakCounter streak={gamification.streak} size="sm" />
            )}

            <div className="h-2.5 w-[1px] bg-indigo-100 dark:bg-white/15 hidden sm:block" />

            {/* Coins Balance */}
            <motion.button
              onClick={() => router.push('/shop')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
              title="Quest Coins (Click to visit Item Shop)"
            >
              <CoinIcon className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 font-mono tabular-nums">
                {typeof coins === 'number'
                  ? coins
                  : typeof coins === 'object' && coins && 'bc' in (coins as any)
                  ? Number((coins as any).bc) || 0
                  : 0}
              </span>
            </motion.button>

            <div className="h-2.5 w-[1px] bg-indigo-100 dark:bg-white/15 hidden sm:block" />

            {/* XP / Level Indicator */}
            {gamification && (
              <motion.div
                onClick={() => router.push('/analytics')}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-1 text-[10px] font-bold text-primary dark:text-primary-light font-mono tabular-nums cursor-pointer"
                title={`Level ${gamification.level} (${gamification.xp?.toLocaleString() || 0} XP)`}
              >
                <HiLightningBolt size={11} className="text-amber-400" />
                <span className="hidden sm:inline">
                  {typeof gamification.xp === 'number' ? gamification.xp.toLocaleString() : '0'} XP
                </span>
                <span className="sm:hidden">
                  Lv.{gamification.level}
                </span>
              </motion.div>
            )}
          </div>

          {/* Action Socket 1: Dark/Light Mode Toggle */}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white/90 dark:bg-[#111328]/85 backdrop-blur-md hover:bg-indigo-50/70 dark:hover:bg-white/[0.08] border border-indigo-100 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-primary transition-all cursor-pointer shadow-2xs"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <HiSun size={12} /> : <HiMoon size={12} />}
          </motion.button>

          {/* Action Socket 2: Fullscreen Toggle */}
          {isSupported && (
            <motion.button
              onClick={toggleFullscreen}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="hidden md:flex w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white/90 dark:bg-[#111328]/85 backdrop-blur-md hover:bg-indigo-50/70 dark:hover:bg-white/[0.08] border border-indigo-100 dark:border-white/10 items-center justify-center text-slate-700 dark:text-slate-300 hover:text-primary transition-all cursor-pointer shadow-2xs"
              title={isFullscreen ? 'Exit Immersion Mode' : 'Enter Immersion Mode'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <HiArrowsPointingIn size={12} /> : <HiArrowsPointingOut size={12} />}
            </motion.button>
          )}

          {/* Action Socket 3: Notifications Bell */}
          <motion.button
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="relative w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white/90 dark:bg-[#111328]/85 backdrop-blur-md hover:bg-indigo-50/70 dark:hover:bg-white/[0.08] border border-indigo-100 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-primary transition-all cursor-pointer shadow-2xs"
            title="Notifications & Friends"
            aria-label="Notifications"
          >
            <HiBell size={14} />
            {incomingRequests.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-coral text-white text-[8px] font-bold flex items-center justify-center shadow-xs">
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
