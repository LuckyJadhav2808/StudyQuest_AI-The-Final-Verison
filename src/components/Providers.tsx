'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
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

  return (
    <div
      className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${focusMode ? 'ml-0' : ''}`}
      style={focusMode ? { marginLeft: 0 } : { marginLeft: collapsed ? 72 : 272 }}
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

  // Start broadcasting online presence (heartbeat)
  usePresence();

  // Apply shop customizations (custom cursors, borders, sounds)
  useCustomization();

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
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
      </div>
    </AuthGuard>
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
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
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
        />
      </ThemeProvider>
    </AuthProvider>
  );
}
