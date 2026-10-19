'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface DesktopShellContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (v: boolean) => void;
  toggleCommandPalette: () => void;
  aiDrawerOpen: boolean;
  setAiDrawerOpen: (v: boolean) => void;
  toggleAiDrawer: () => void;
  newMenuOpen: boolean;
  setNewMenuOpen: (v: boolean) => void;
  toggleNewMenu: () => void;
  contextPanel: React.ReactNode | null;
  setContextPanel: (node: React.ReactNode | null) => void;
  toggleContextPanel: () => void;
  isContextPanelOpen: boolean;
  setIsContextPanelOpen: (v: boolean) => void;
}

const DesktopShellContext = createContext<DesktopShellContextType | null>(null);

export function useDesktopShell() {
  const ctx = useContext(DesktopShellContext);
  if (!ctx) {
    throw new Error('useDesktopShell must be used within a DesktopShell');
  }
  return ctx;
}

export function DesktopShellProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fx-sidebar');
        if (saved !== null) {
          return JSON.parse(saved);
        }
        return window.innerWidth < 1280;
      } catch {
        return false;
      }
    }
    return false;
  });

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [contextPanel, setContextPanel] = useState<React.ReactNode | null>(null);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);

  const setSidebarCollapsed = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsedState((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      try {
        localStorage.setItem('fx-sidebar', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, [setSidebarCollapsed]);

  const toggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen((prev) => !prev);
  }, []);

  const toggleAiDrawer = useCallback(() => {
    setAiDrawerOpen((prev) => !prev);
  }, []);

  const toggleNewMenu = useCallback(() => {
    setNewMenuOpen((prev) => !prev);
  }, []);

  const toggleContextPanel = useCallback(() => {
    if (contextPanel !== null) {
      setIsContextPanelOpen((prev) => !prev);
    }
  }, [contextPanel]);

  return (
    <DesktopShellContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        commandPaletteOpen,
        setCommandPaletteOpen,
        toggleCommandPalette,
        aiDrawerOpen,
        setAiDrawerOpen,
        toggleAiDrawer,
        newMenuOpen,
        setNewMenuOpen,
        toggleNewMenu,
        contextPanel,
        setContextPanel,
        toggleContextPanel,
        isContextPanelOpen,
        setIsContextPanelOpen,
      }}
    >
      {children}
    </DesktopShellContext.Provider>
  );
}
