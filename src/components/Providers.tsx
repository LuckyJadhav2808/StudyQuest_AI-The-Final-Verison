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
import { usePresence } from '@/hooks/usePresence';

function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div
      className="flex-1 flex flex-col min-h-screen transition-[margin-left] duration-250 ease-in-out"
      style={{ marginLeft: collapsed ? 72 : 272 }}
    >
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  // Start broadcasting online presence (heartbeat)
  usePresence();

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar (Desktop) */}
        <Sidebar />

        {/* Main Content — margin adjusts with sidebar */}
        <MainContent>{children}</MainContent>

        {/* Mobile Nav */}
        <MobileNav />

        {/* Global Command Palette (Ctrl+K) */}
        <CommandPalette />

        {/* Floating XP Particles */}
        <FloatingXPContainer />
      </div>
    </AuthGuard>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SidebarProvider>
          <AppShell>{children}</AppShell>
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
      </AuthProvider>
    </ThemeProvider>
  );
}
