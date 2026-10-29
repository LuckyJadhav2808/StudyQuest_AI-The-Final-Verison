'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster, ToastBar, useToasterStore, toast } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { ThemeProvider, useMotion } from '@/context/ThemeContext';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import AuthGuard from '@/components/auth/AuthGuard';
import CommandPalette from '@/components/layout/CommandPalette';
import FloatingXPContainer from '@/components/gamification/FloatingXP';
import FloatingTimerWidget from '@/components/timer/FloatingTimerWidget';
import { TimerProvider } from '@/context/TimerContext';
import { MusicProvider } from '@/context/MusicContext';
import { GamificationProvider } from '@/context/GamificationContext';
import { ShopProvider } from '@/context/ShopContext';
import { PetProvider } from '@/context/PetContext';
import { TasksProvider } from '@/context/TasksContext';
import { FriendsProvider } from '@/context/FriendsContext';
import { SkillTreeProvider } from '@/context/SkillTreeContext';
import { NotesProvider } from '@/context/NotesContext';
import GlobalMusicPlayer from '@/components/music/GlobalMusicPlayer';
import ParticleBackground from '@/components/ui/ParticleBackground';
import StickyNotesOverlay from '@/components/ui/StickyNotesOverlay';
import LevelUpOverlay from '@/components/gamification/LevelUpOverlay';
import { usePresence } from '@/hooks/usePresence';
import { useCustomization } from '@/hooks/useCustomization';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import PatchNotesModal from '@/components/ui/PatchNotesModal';
import { usePet } from '@/hooks/usePet';
import { useGamification } from '@/hooks/useGamification';
import { playSuccess } from '@/lib/sounds';
import { PET_STAGES } from '@/lib/constants';
import { useShop } from '@/hooks/useShop';
import PixelPet from '@/components/dashboard/PixelPet';
import ScrollToTop from '@/components/ui/ScrollToTop';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import OnboardingTour from '@/components/ui/OnboardingTour';

/**
 * Animated SVG background grid — creates a subtle, immersive "command center" aesthetic.
 * Very faint lines that slowly shift, giving the app depth.
 */
const AnimatedGrid = React.memo(function AnimatedGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Radial gradient overlay — gives grid a natural falloff from center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, transparent 20%, var(--background) 80%)',
        }}
      />
    </div>
  );
});

function MainContent({ children }: { children: React.ReactNode }) {
  const { focusMode } = useSidebar();
  const pathname = usePathname();
  const isWorkstationPage = pathname === '/notes' || pathname === '/reader' || pathname === '/whiteboard' || pathname === '/ide';

  return (
    <div className="w-screen h-screen max-h-screen overflow-hidden relative flex flex-col items-center justify-center p-1.5 sm:p-2.5 md:p-3 bg-[#F0EDF8] dark:bg-[#070913]">
      {/* Ambient Chromatic Blooms for Prismatic Aura Glassmorphism */}
      <div className="absolute top-[-10%] left-[8%] w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,_rgba(124,58,237,0.30)_0%,_transparent_68%)] filter blur-[60px] pointer-events-none opacity-60 dark:opacity-40 animate-pulse [animation-duration:11s] will-change-transform z-0" />
      <div className="absolute bottom-[-10%] right-[8%] w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,_rgba(236,72,153,0.22)_0%,_transparent_68%)] filter blur-[65px] pointer-events-none opacity-50 dark:opacity-35 animate-pulse [animation-duration:15s] will-change-transform z-0" />
      <div className="absolute top-[35%] left-[38%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,_rgba(6,182,212,0.18)_0%,_transparent_70%)] filter blur-[55px] pointer-events-none opacity-45 dark:opacity-30 animate-pulse [animation-duration:13s] will-change-transform z-0" />

      {/* Outer App Shell: Central Framed Container with Large Outer Rounded Corners */}
      <div className="w-full h-full max-h-[100dvh] flex flex-col rounded-[26px] sm:rounded-[32px] md:rounded-[36px] border-2 border-indigo-200/90 dark:border-white/14 bg-white/75 dark:bg-[#0E1024]/65 backdrop-blur-2xl shadow-[0_16px_48px_-12px_rgba(124,58,237,0.22)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] overflow-hidden p-2 sm:p-2.5 md:p-3 relative z-10 min-w-0">
        {/* Persistent Top Header (Header Pill Bar) */}
        {!focusMode && <Header />}

        {/* Horizontal Row: Persistent Sidebar Rail + Main Content Viewport */}
        <div className="flex-1 min-h-0 flex gap-2 sm:gap-2.5 md:gap-3 mt-1.5 sm:mt-2 overflow-hidden">
          {/* Persistent Left Rail Sidebar (Desktop) */}
          {!focusMode && (
            <div className="hidden md:flex h-full flex-shrink-0">
              <Sidebar />
            </div>
          )}

          {/* Main Content Viewport */}
          <main
            onScroll={isWorkstationPage ? (e) => { if (e.currentTarget.scrollTop !== 0) e.currentTarget.scrollTop = 0; } : undefined}
            className={`flex-1 min-w-0 h-full rounded-[20px] sm:rounded-[24px] md:rounded-[28px] border border-indigo-100/80 dark:border-white/10 bg-white/45 dark:bg-[#0B0D17]/45 backdrop-blur-md relative z-10 min-h-0 ${
              focusMode
                ? 'p-1.5 md:p-2.5 overflow-hidden flex flex-col'
                : isWorkstationPage
                ? 'flex-1 min-h-0 overflow-hidden flex flex-col p-0'
                : pathname === '/'
                ? 'md:overflow-hidden overflow-y-auto p-2 sm:p-2.5 md:p-3 flex flex-col justify-between pb-20 md:pb-2.5'
                : 'overflow-y-auto p-2.5 sm:p-3.5 md:p-4 pb-20 md:pb-4'
            }`}
          >
            {!focusMode && !isWorkstationPage && pathname !== '/' && <Breadcrumbs />}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isWorkstationPage = pathname === '/notes' || pathname === '/reader' || pathname === '/whiteboard' || pathname === '/ide';
  const { focusMode } = useSidebar();
  const { reduceMotion } = useMotion();
  const { coins, addCoins } = useShop();

  // Start broadcasting online presence (heartbeat)
  usePresence();

  // Apply shop customizations (custom cursors, borders, sounds)
  useCustomization();

  // Global background pet evolution check
  const { pet, hasPet, checkEvolution } = usePet();
  const { gamification, checkStreak } = useGamification();

  useEffect(() => {
    if (!gamification || !checkStreak) return;

    // Run initial streak check
    checkStreak();

    // Re-check streak when user returns to tab / focuses window (throttled to at most once per 60s)
    let lastChecked = Date.now();
    const handleActive = () => {
      if (Date.now() - lastChecked > 60000) {
        lastChecked = Date.now();
        checkStreak();
      }
    };

    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', handleActive);

    // Schedule check for next midnight instead of 180s continuous interval
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msUntilMidnight = Math.max(1000, midnight.getTime() - now.getTime());
    const midnightTimer = setTimeout(() => {
      checkStreak();
    }, msUntilMidnight);

    return () => {
      window.removeEventListener('focus', handleActive);
      document.removeEventListener('visibilitychange', handleActive);
      clearTimeout(midnightTimer);
    };
  }, [checkStreak, gamification?.lastActiveDate]);

  useEffect(() => {
    if (!hasPet || !pet || pet.stage >= 4 || !gamification) return;
    checkEvolution(gamification).then((evolved) => {
      if (evolved) {
        playSuccess();
        toast.success(`🌟 Your companion ${pet.name} evolved to ${PET_STAGES[pet.stage + 1]?.name ?? 'Legendary'}!`, { duration: 6000 });
      }
    });
  }, [
    gamification?.totalTasksCompleted,
    gamification?.totalFocusMinutes,
    gamification?.streak,
    pet?.totalFeedings,
    pet?.totalPlaySessions,
    pet?.equippedAccessories?.length,
    hasPet,
    pet?.stage,
    checkEvolution,
    gamification
  ]);

  if (isLoginPage) {
    return (
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
        {children}
      </MotionConfig>
    );
  }

  return (
    <AuthGuard>
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
        <div className="flex h-screen overflow-hidden relative">
          {/* Animated Background Grid */}
          <AnimatedGrid />

          {/* Floating Particle Background */}
          <ParticleBackground />

          {/* Main Content with Persistent Framed Shell (Header + Left Rail + Viewport) */}
          <MainContent>{children}</MainContent>

          {/* Mobile Nav — hidden in focus mode */}
          {!focusMode && <MobileNav />}

          {/* Global Command Palette (Ctrl+K) */}
          <CommandPalette />

          {/* Floating XP Particles */}
          <FloatingXPContainer />

          {/* Cinematic Level-Up Overlay */}
          <LevelUpOverlay />

          {/* Global Sticky Notes */}
          <StickyNotesOverlay />

          {/* Offline Deep Work Mode Indicator */}
          <OfflineIndicator />


          {/* Patch Notes Modal (shows on new version) */}
          <PatchNotesModal />

          {/* Global Pixel Pet Companion */}
          <PixelPet coins={coins} addCoins={addCoins} />

          {/* Scroll to Top FAB (omitted on fixed workstation apps) */}
          {!isWorkstationPage && <ScrollToTop />}

          {/* First Time User Onboarding Tour */}
          <OnboardingTour />
        </div>
      </MotionConfig>
    </AuthGuard>
  );
}

function QueueToaster() {
  const { toasts } = useToasterStore();
  const [position, setPosition] = useState<'top-right' | 'top-center'>('top-right');

  useEffect(() => {
    const handleResize = () => {
      setPosition(window.innerWidth < 768 ? 'top-center' : 'top-right');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Limit simultaneously visible toasts to 3 so notifications don't overwhelm the viewport,
  // gracefully dismissing older toasts while never hiding new toasts with display:none
  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= 3)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts]);

  return (
    <Toaster
      position={position}
      gutter={8}
      containerStyle={{
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      }}
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: '16px',
          background: 'var(--card-bg)',
          color: 'var(--foreground)',
          border: '2px solid var(--card-border)',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: 'var(--font-heading)',
          boxShadow: '0 12px 30px rgba(124, 58, 237, 0.15)',
          padding: '12px 18px',
          maxWidth: 'min(460px, calc(100vw - 32px))',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          lineHeight: '1.45',
          overflow: 'hidden',
          zIndex: 99999,
        },
        success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
        error: { iconTheme: { primary: '#FF6B6B', secondary: '#fff' } },
      }}
    />
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SidebarProvider>
          <MusicProvider>
            <GamificationProvider>
              <SkillTreeProvider>
                <TasksProvider>
                  <FriendsProvider>
                    <NotesProvider>
                      <ShopProvider>
                        <PetProvider>
                          <TimerProvider>
                            <AppShell>{children}</AppShell>
                            <FloatingTimerWidget />
                            <GlobalMusicPlayer />
                          </TimerProvider>
                        </PetProvider>
                      </ShopProvider>
                    </NotesProvider>
                  </FriendsProvider>
                </TasksProvider>
              </SkillTreeProvider>
            </GamificationProvider>
          </MusicProvider>
        </SidebarProvider>
        <QueueToaster />
      </ThemeProvider>
    </AuthProvider>
  );
}
