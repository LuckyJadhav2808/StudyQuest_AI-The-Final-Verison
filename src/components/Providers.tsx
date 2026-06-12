'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster, ToastBar, useToasterStore, toast } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import AuthGuard from '@/components/auth/AuthGuard';
import CommandPalette from '@/components/layout/CommandPalette';
import FloatingXPContainer from '@/components/gamification/FloatingXP';
import FloatingTimerWidget from '@/components/timer/FloatingTimerWidget';
import { TimerProvider } from '@/context/TimerContext';
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

/**
 * Animated SVG background grid — creates a subtle, immersive "command center" aesthetic.
 * Very faint lines that slowly shift, giving the app depth.
 */
function AnimatedGrid() {
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
}

function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed, focusMode } = useSidebar();
  const { reduceMotion } = useTheme();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sidebarMargin = focusMode || isMobile ? 0 : collapsed ? 72 : 272;

  return (
    <div
      className={`flex-1 flex flex-col min-h-screen ${reduceMotion ? '' : 'transition-[margin-left] duration-250 ease-in-out'}`}
      style={{ marginLeft: sidebarMargin }}
    >
      {!focusMode && <Header />}
      <main className={`flex-1 overflow-y-auto relative z-10 ${focusMode ? 'p-0' : 'p-4 md:p-6 pb-20 md:pb-6'}`}>
        {children}
      </main>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const { focusMode } = useSidebar();
  const { reduceMotion } = useTheme();

  // Start broadcasting online presence (heartbeat)
  usePresence();

  // Apply shop customizations (custom cursors, borders, sounds)
  useCustomization();

  // Global background pet evolution check
  const { pet, hasPet, checkEvolution } = usePet();
  const { gamification } = useGamification();

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

          {/* Sidebar (Desktop) — hidden in focus mode */}
          {!focusMode && <Sidebar />}

          {/* Main Content — margin adjusts with sidebar */}
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
        </div>
      </MotionConfig>
    </AuthGuard>
  );
}

function QueueToaster() {
  const { toasts } = useToasterStore();
  const currentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentToastIdRef = useRef<string | null>(null);

  const visibleToasts = toasts.filter((t) => t.visible);
  const activeToast = visibleToasts[0];

  useEffect(() => {
    if (!activeToast) {
      if (currentTimerRef.current) {
        clearTimeout(currentTimerRef.current);
        currentTimerRef.current = null;
      }
      currentToastIdRef.current = null;
      return;
    }

    if (currentToastIdRef.current !== activeToast.id) {
      if (currentTimerRef.current) {
        clearTimeout(currentTimerRef.current);
      }
      currentToastIdRef.current = activeToast.id;

      const duration = (activeToast.duration && activeToast.duration !== Infinity && activeToast.duration < 999999)
        ? activeToast.duration
        : 3500;

      currentTimerRef.current = setTimeout(() => {
        toast.dismiss(activeToast.id);
      }, duration);
    }
  }, [activeToast]);

  useEffect(() => {
    return () => {
      if (currentTimerRef.current) {
        clearTimeout(currentTimerRef.current);
      }
    };
  }, []);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: Infinity,
        style: {
          borderRadius: '16px',
          background: 'var(--card-bg)',
          color: 'var(--foreground)',
          border: '2px solid var(--card-border)',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'var(--font-heading)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        },
        success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
        error: { iconTheme: { primary: '#FF6B6B', secondary: '#fff' } },
      }}
    >
      {(t) => {
        if (activeToast?.id !== t.id) {
          return <div style={{ display: 'none' }} />;
        }
        return (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
              </>
            )}
          </ToastBar>
        );
      }}
    </Toaster>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SidebarProvider>
          <TimerProvider>
            <AppShell>{children}</AppShell>
            <FloatingTimerWidget />
          </TimerProvider>
        </SidebarProvider>
        <QueueToaster />
      </ThemeProvider>
    </AuthProvider>
  );
}
