'use client';

import React, { useState } from 'react';
import { 
  Bell, Coins, Expand, Flame, Moon, Search, Shrink, Sparkles, Sun, Sunrise, Sunset, Zap 
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuthContext } from '@/context/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import { useShop } from '@/hooks/useShop';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import NotificationDrawer from '@/components/layout/NotificationDrawer';

const TreasureChestModal = dynamic(() => import('@/components/dashboard/TreasureChestModal'), {
  ssr: false,
});

// Time-of-day greeting generator matching reference
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: "Night Owl Mode", Icon: Moon, color: "text-[#c4b5fd]" };
  if (h < 12) return { text: "Good Morning", Icon: Sunrise, color: "text-amber-400" };
  if (h < 18) return { text: "Good Afternoon", Icon: Sun, color: "text-amber-400" };
  if (h < 22) return { text: "Good Evening", Icon: Sunset, color: "text-pink-400" };
  return { text: "Night Owl Mode", Icon: Moon, color: "text-[#c4b5fd]" };
}

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, profile } = useAuthContext();
  const { gamification } = useGamification();
  const { coins } = useShop();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [showChestModal, setShowChestModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  const username =
    profile?.displayName?.trim()?.split(' ')[0] ||
    user?.displayName?.trim()?.split(' ')[0] ||
    (user?.email ? user.email.split('@')[0] : 'Scholar');

  const greeting = getGreeting();
  const GreetingIcon = greeting.Icon;

  const streak = typeof gamification?.streak === 'number' ? gamification.streak : 0;
  const rawCoins = typeof coins === 'number'
    ? coins
    : typeof coins === 'object' && coins && 'bc' in (coins as any)
    ? Number((coins as any).bc) || 0
    : 0;
  const coinsCount = rawCoins || 0;
  const xpCount = typeof gamification?.xp === 'number' ? gamification.xp : 0;
  const level = typeof gamification?.level === 'number' && gamification.level > 0 ? gamification.level : 1;
  const levelProgress = (xpCount % 1000) / 1000;

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <>
      <header className="glass-bar relative z-20 flex h-[54px] sm:h-[58px] shrink-0 items-center justify-between gap-2 sm:gap-3 rounded-[22px] px-3 select-none flex-nowrap">
        {/* ============================================================
            BRAND + SEARCH (LEFT)
            ============================================================ */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5 shrink-0">
          <div
            onClick={() => router.push('/')}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
            title="StudyQuest Dashboard"
          >
            <div className="tile tone-iris h-9 w-9 sm:h-10 sm:w-10 rounded-[14px] shrink-0">
              <Sparkles size={18} strokeWidth={2.3} className="group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="font-heading text-gradient text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap">StudyQuest</span>
          </div>

          <label
            onClick={openCommandPalette}
            className="well hidden md:flex h-9 w-36 lg:w-48 xl:w-56 items-center gap-2 rounded-xl px-2.5 sm:px-3 text-slate-400 focus-within:border-purple-500/60 cursor-pointer shrink-0"
          >
            <Search size={14} className="shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 text-xs text-slate-400 truncate whitespace-nowrap hidden lg:inline">Search quests, notes...</span>
            <span className="min-w-0 flex-1 text-xs text-slate-400 truncate whitespace-nowrap lg:hidden">Search...</span>
            <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 font-mono shrink-0">Ctrl K</kbd>
          </label>
        </div>

        {/* ============================================================
            TIME-OF-DAY GREETING (CENTER)
            ============================================================ */}
        <div
          onClick={() => setShowChestModal(true)}
          className="well hidden xl:flex items-center gap-2 rounded-2xl px-3.5 py-1.5 cursor-pointer hover:border-purple-500/40 transition-colors shrink-0"
          title={`Daily status & chest · ${username}`}
        >
          <GreetingIcon size={15} className={`${greeting.color} shrink-0`} />
          <span className="font-heading text-xs sm:text-sm font-semibold text-white whitespace-nowrap inline-flex items-center gap-1">
            <span className="shrink-0">{greeting.text},</span>
            <span className="text-gradient font-bold truncate max-w-[240px] 2xl:max-w-[320px] inline-block">{username}</span>
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-500 shrink-0 mx-0.5" />
          <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">Stay focused</span>
        </div>

        {/* ============================================================
            STATS HUD + ACTIONS (RIGHT)
            ============================================================ */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Streak Counter */}
          <div className="well flex h-9 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm font-bold text-amber-400 whitespace-nowrap shrink-0">
            <Flame size={15} className="drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] shrink-0" />
            <span className="font-mono tabular">{streak}</span>
          </div>

          {/* Coins Balance */}
          <div
            onClick={() => router.push('/shop')}
            className="well flex h-9 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm font-bold text-amber-300 cursor-pointer hover:border-amber-400/40 whitespace-nowrap shrink-0"
            title="Quest Coins (Click for Item Shop)"
          >
            <Coins size={15} className="shrink-0" />
            <span className="tabular font-mono text-white">{coinsCount.toLocaleString()}</span>
          </div>

          {/* XP & Level Bar */}
          <div
            onClick={() => router.push('/analytics')}
            className="well relative flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm font-bold text-cyan-400 cursor-pointer hover:border-cyan-400/40 whitespace-nowrap shrink-0"
            title={`Level ${level} (${xpCount.toLocaleString()} XP)`}
          >
            <Zap size={15} className="fill-cyan-400/30 text-cyan-400 shrink-0" />
            <span className="tabular font-mono text-white whitespace-nowrap">{xpCount.toLocaleString()} XP</span>
            <span className="rounded-md bg-[#8b5cf6]/25 px-1.5 text-[9px] sm:text-[10px] text-[#c4b5fd] whitespace-nowrap font-mono">LV {level}</span>
            <span className="absolute inset-x-0 bottom-0 h-[2.5px] bg-black/25">
              <span
                className="block h-full rounded-r-full bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#22d3ee] transition-all duration-700"
                style={{ width: `${levelProgress * 100}%` }}
              />
            </span>
          </div>

          <span className="mx-0.5 sm:mx-1 hidden h-6 w-px bg-white/10 sm:block" />

          {/* Action: Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="raised relative grid h-9 w-9 place-items-center rounded-xl text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Action: Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
            title="Toggle fullscreen"
            className="raised relative grid h-9 w-9 place-items-center rounded-xl text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            {isFullscreen ? <Shrink size={15} /> : <Expand size={15} />}
          </button>

          {/* Action: Notifications */}
          <button
            onClick={() => setShowNotifications(true)}
            aria-label="Notifications"
            title="Notifications"
            className="raised relative grid h-9 w-9 place-items-center rounded-xl text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
          </button>
        </div>
      </header>

      {/* Slide-over Drawers and Modals */}
      <NotificationDrawer
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {showChestModal && (
        <TreasureChestModal
          isOpen={showChestModal}
          onClose={() => setShowChestModal(false)}
        />
      )}
    </>
  );
}
