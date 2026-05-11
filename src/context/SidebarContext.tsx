'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleFocusMode: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  toggle: () => {},
  focusMode: false,
  setFocusMode: () => {},
  toggleFocusMode: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const toggle = useCallback(() => setCollapsed((prev) => !prev), []);
  const toggleFocusMode = useCallback(() => setFocusMode((prev) => !prev), []);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle, focusMode, setFocusMode, toggleFocusMode }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
