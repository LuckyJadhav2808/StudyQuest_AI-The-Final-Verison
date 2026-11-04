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
    (user?.email ? user.email.split('@')[0] : 'Luckx2808');

  const greeting = getGreeting();
  const GreetingIcon = greeting.Icon;

  const streak = gamification?.streak || 3;
  const rawCoins = typeof coins === 'number'
    ? coins
    : typeof coins === 'object' && coins && 'bc' in (coins as any)
    ? Number((coins as any).bc) || 1872
    : 1872;
  const coinsCount = rawCoins || 1872;
  const xpCount = gamification?.xp || 4699;
  const level = gamification?.level || 9;
  const levelProgress = (xpCount % 1000) / 1000;

  const openCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <>
      <header className="glass-bar relative z-20 flex h-[54px] sm:h-[58px] shrink-0 items-center justify-between gap-3 rounded-[22px] px-3 select-none">
        {/* ============================================================
            BRAND + SEARCH (LEFT)
            ============================================================ */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 cursor-pointer group"
            title="StudyQuest Dashboard"
          >
            <div className="tile tone-iris h-10 w-10 rounded-[14px]">
              <Sparkles size={20} strokeWidth={2.3} className="group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="font-heading text-gradient text-xl font-bold tracking-tight">StudyQuest</span>
          </div>

          <label
            onClick={openCommandPalette}
            className="well hidden h-9 w-44 items-center gap-2 rounded-xl px-3 text-slate-400 focus-within:border-purple-500/60 md:flex xl:w-56 cursor-pointer"
          >
            <Search size={15} />
            <span className="min-w-0 flex-1 text-sm text-slate-400 truncate">Search quests, notes…</span>
            <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 font-mono">Ctrl K</kbd>
          </label>
        </div>

        {/* ============================================================
            TIME-OF-DAY GREETING (CENTER)
            ============================================================ */}
        <div
          onClick={() => setShowChestModal(true)}
          className="well hidden items-center gap-2.5 rounded-2xl px-5 py-1.5 xl:flex cursor-pointer hover:border-purple-500/40 transition-colors"
          title="Daily status & chest"
        >
          <GreetingIcon size={17} className={greeting.color} />
          <span className="font-heading text-sm font-bold text-white">
            {greeting.text},{' '}
            <span className="text-gradient font-bold">{username}</span>
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-500" />
          <span className="text-xs text-slate-400">Stay focused</span>
        </div>

        {/* ============================================================
            STATS HUD + ACTIONS (RIGHT)
            ============================================================ */}
        <div className="flex items-center gap-2">
          {/* Streak Counter */}
          <div className="well flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-amber-400">
            <Flame size={16} className="drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
            <span className="font-mono tabular">{streak}</span>
          </div>

          {/* Coins Balance */}
          <div
            onClick={() => router.push('/shop')}
            className="well flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-amber-300 cursor-pointer hover:border-amber-400/40"
            title="Quest Coins (Click for Item Shop)"
          >
            <Coins size={16} />
            <span className="tabular font-mono text-white">{coinsCount.toLocaleString()}</span>
          </div>

          {/* XP & Level Bar */}
          <div
            onClick={() => router.push('/analytics')}
            className="well relative flex h-9 items-center gap-1.5 overflow-hidden rounded-xl px-3 text-sm font-bold text-cyan-400 cursor-pointer hover:border-cyan-400/40"
            title={`Level ${level} (${xpCount.toLocaleString()} XP)`}
          >
            <Zap size={16} className="fill-cyan-400/30 text-cyan-400" />
            <span className="tabular font-mono text-white">{xpCount.toLocaleString()} XP</span>
            <span className="rounded-md bg-[#8b5cf6]/25 px-1.5 text-[10px] text-[#c4b5fd]">LV {level}</span>
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-black/20">
              <span
                className="block h-full rounded-r-full bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#22d3ee] transition-all duration-700"
                style={{ width: `${levelProgress * 100}%` }}
              />
            </span>
          </div>

          <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />

          {/* Action: Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="raised relative grid h-9 w-9 place-items-center rounded-xl text-slate-300 hover:text-white cursor-pointer"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Action: Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
            title="Toggle fullscreen"
            className="raised relative grid h-9 w-9 place-items-center rounded-xl text-slate-300 hover:text-white cursor-pointer"
          >
            {isFullscreen ? <Shrink size={16} /> : <Expand size={16} />}
          </button>

          {/* Action: Notifications */}
          <button
            onClick={() => setShowNotifications(true)}
            aria-label="Notifications"
            title="Notifications"
            className="raised relative grid h-9 w-9 place-items-center rounded-xl text-slate-300 hover:text-white cursor-pointer"
          >
            <Bell size={16} />
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
