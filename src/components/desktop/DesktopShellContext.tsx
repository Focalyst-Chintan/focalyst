'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

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
  // Global modal triggers for desktop
  habitModalOpen: boolean;
  setHabitModalOpen: (v: boolean) => void;
  editingHabit: any | null;
  setEditingHabit: (h: any | null) => void;
  openNewHabitModal: () => void;
  openEditHabitModal: (habit: any) => void;
  reminderModalOpen: boolean;
  setReminderModalOpen: (v: boolean) => void;
  editingReminder: any | null;
  setEditingReminder: (r: any | null) => void;
  openNewReminderModal: (prefillDate?: string) => void;
  openEditReminderModal: (reminder: any) => void;
  reminderPrefillDate: string | null;
  // Trigger to focus task composer on /plan?view=tasks
  composerFocusTrigger: number;
  triggerComposerFocus: () => void;
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

  // Modals state
  const [habitModalOpen, setHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any | null>(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);
  const [reminderPrefillDate, setReminderPrefillDate] = useState<string | null>(null);
  const [composerFocusTrigger, setComposerFocusTrigger] = useState(0);

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

  const openNewHabitModal = useCallback(() => {
    setEditingHabit(null);
    setHabitModalOpen(true);
  }, []);

  const openEditHabitModal = useCallback((habit: any) => {
    setEditingHabit(habit);
    setHabitModalOpen(true);
  }, []);

  const openNewReminderModal = useCallback((prefillDate?: string) => {
    setEditingReminder(null);
    setReminderPrefillDate(prefillDate || null);
    setReminderModalOpen(true);
  }, []);

  const openEditReminderModal = useCallback((reminder: any) => {
    setEditingReminder(reminder);
    setReminderPrefillDate(null);
    setReminderModalOpen(true);
  }, []);

  const triggerComposerFocus = useCallback(() => {
    setComposerFocusTrigger((prev) => prev + 1);
  }, []);

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
        habitModalOpen,
        setHabitModalOpen,
        editingHabit,
        setEditingHabit,
        openNewHabitModal,
        openEditHabitModal,
        reminderModalOpen,
        setReminderModalOpen,
        editingReminder,
        setEditingReminder,
        openNewReminderModal,
        openEditReminderModal,
        reminderPrefillDate,
        composerFocusTrigger,
        triggerComposerFocus,
      }}
    >
      {children}
    </DesktopShellContext.Provider>
  );
}
