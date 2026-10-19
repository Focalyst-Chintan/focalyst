'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Sun,
  CalendarCheck2,
  Timer,
  NotebookPen,
  ChartColumn,
  Users,
  Plug,
  Settings,
  LogOut,
  PanelLeft,
  Sparkles,
  Gem,
  Plus,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { useDesktopShell } from './DesktopShellContext';
import { Tooltip } from '@/components/desktop/ui/Tooltip';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { Avatar } from '@/components/desktop/ui/Avatar';
import { Button } from '@/components/desktop/ui/Button';
import { Popover } from '@/components/desktop/ui/Popover';
import { ThemeSwitch } from '@/components/desktop/ui/ThemeSwitch';
import { Kbd } from '@/components/desktop/ui/Kbd';
import AmbientBackground from '@/components/desktop/AmbientBackground';
import { CommandPalette } from './CommandPalette';
import { AIDrawer } from './AIDrawer';
import { useDesktopShortcuts } from '@/hooks/useDesktopShortcuts';
import { useTheme } from 'next-themes';

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, plan, signOut } = useAuth();
  const { reminders, getRemindersForDate } = usePlan();
  const { theme, setTheme } = useTheme();

  const {
    sidebarCollapsed,
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
    isContextPanelOpen,
    toggleContextPanel,
  } = useDesktopShell();

  // Register Global Desktop Shortcuts
  useDesktopShortcuts({
    onToggleCommandPalette: toggleCommandPalette,
    onToggleAiDrawer: toggleAiDrawer,
    onToggleSidebar: toggleSidebar,
    onToggleContextPanel: toggleContextPanel,
    onOpenNewMenu: toggleNewMenu,
    onEscape: () => {
      if (commandPaletteOpen) {
        setCommandPaletteOpen(false);
      } else if (aiDrawerOpen) {
        setAiDrawerOpen(false);
      } else if (newMenuOpen) {
        setNewMenuOpen(false);
      }
    },
  });

  const isPro = plan !== 'free';
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  // Calculate upcoming reminders for today
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayReminders = useMemo(() => {
    return (reminders || []).filter((r) => r.date === todayStr);
  }, [reminders, todayStr]);

  const hasUpcomingReminders = todayReminders.length > 0;

  // Primary Nav items
  const navItems = [
    { label: 'Today', href: '/today', icon: Sun },
    { label: 'Plan', href: '/plan', icon: CalendarCheck2 },
    { label: 'Focus', href: '/focus', icon: Timer },
    { label: 'Notes', href: '/notes', icon: NotebookPen },
    { label: 'Insights', href: '/insights', icon: ChartColumn },
    { label: 'Groups', href: '/groups', icon: Users },
  ];

  // Plan sub-items
  const isPlanActive = pathname.startsWith('/plan');
  const currentPlanView = searchParams.get('view') || 'habits';

  // Current page title for top bar
  const getPageTitle = () => {
    if (pathname.startsWith('/today')) return 'Today';
    if (pathname.startsWith('/plan')) {
      const viewTitle =
        currentPlanView === 'tasks' ? 'Tasks' : currentPlanView === 'calendar' ? 'Calendar' : 'Habits';
      return (
        <span className="flex items-center text-[15px]">
          <span className="text-ink-3">Plan</span>
          <span className="text-ink-3 mx-1.5">/</span>
          <span className="text-ink font-semibold">{viewTitle}</span>
        </span>
      );
    }
    if (pathname.startsWith('/focus')) return 'Focus';
    if (pathname.startsWith('/notes')) return 'Notes';
    if (pathname.startsWith('/insights')) return 'Insights';
    if (pathname.startsWith('/groups')) return 'Groups';
    if (pathname.startsWith('/mcp')) return 'MCP';
    if (pathname.startsWith('/account')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <div className="relative min-h-screen w-full bg-page-bg text-ink font-ui antialiased overflow-x-hidden">
      {/* Ambient Canvas background */}
      <div className="hidden lg:block">
        <AmbientBackground />
      </div>

      {/* =========================================================================
          DESKTOP SIDEBAR
          ========================================================================= */}
      <aside
        className={`fixed top-3 left-3 bottom-3 z-40 hidden lg:flex flex-col rounded-[28px] glass-strong liquid p-4 transition-[width] duration-[220ms] ease-[var(--ease)] overflow-hidden shadow-[var(--shadow-2)] ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[256px]'
        }`}
      >
        {/* Top Row */}
        <div className="h-12 flex items-center justify-between px-2 shrink-0">
          {!sidebarCollapsed ? (
            <>
              <span className="font-ui font-semibold text-[13px] tracking-[0.32em] text-ink select-none">
                FOCALYST
              </span>
              <IconButton
                size="sm"
                variant="ghost"
                tooltip="Collapse ⌘\"
                onClick={toggleSidebar}
              >
                <PanelLeft className="w-4 h-4 text-ink-2" />
              </IconButton>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <IconButton
                size="md"
                variant="ghost"
                tooltip="Expand ⌘\"
                onClick={toggleSidebar}
              >
                <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center text-snow font-bold text-[12px]">
                  F
                </div>
              </IconButton>
            </div>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="mt-6 flex flex-col gap-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);

            const content = (
              <Link
                key={item.href}
                href={item.href}
                className={`h-10 px-3 rounded-[12px] flex items-center gap-3 text-[14px] font-medium transition-colors ${
                  active
                    ? 'bg-surface dark:bg-surface-2 shadow-[var(--shadow-1)] text-ink'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
                } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.75}
                  className={`shrink-0 ${active ? 'text-primary-text' : 'text-current'}`}
                />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href} content={item.label} side="right">
                  {content}
                </Tooltip>
              );
            }

            return (
              <React.Fragment key={item.href}>
                {content}
                {/* Plan Sub-items (expanded only when on /plan) */}
                {item.href === '/plan' && isPlanActive && !sidebarCollapsed && (
                  <div className="relative flex flex-col gap-0.5 my-1">
                    <div className="absolute left-[21px] top-1 bottom-1 w-px bg-line" />
                    {[
                      { label: 'Habits', view: 'habits' },
                      { label: 'Tasks', view: 'tasks' },
                      { label: 'Calendar', view: 'calendar' },
                    ].map((sub) => {
                      const isSubActive = currentPlanView === sub.view;
                      return (
                        <Link
                          key={sub.view}
                          href={`/plan?view=${sub.view}`}
                          className={`h-8 pl-8 pr-3 rounded-[8px] flex items-center text-[13px] relative transition-colors ${
                            isSubActive
                              ? 'font-semibold text-ink'
                              : 'text-ink-3 hover:text-ink-2'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* LABS Section */}
        <div className="mt-6 flex flex-col shrink-0">
          {!sidebarCollapsed ? (
            <span className="text-[11px] leading-[14px] font-medium uppercase tracking-[0.08em] text-ink-3 px-3 mb-2">
              LABS
            </span>
          ) : (
            <div className="h-px bg-line mx-2 my-2" />
          )}

          {sidebarCollapsed ? (
            <Tooltip content="MCP (Soon)" side="right">
              <Link
                href="/mcp"
                className={`h-10 rounded-[12px] flex items-center justify-center text-[14px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink ${
                  pathname.startsWith('/mcp') ? 'bg-surface dark:bg-surface-2 text-ink' : ''
                }`}
              >
                <Plug size={18} strokeWidth={1.75} />
              </Link>
            </Tooltip>
          ) : (
            <Link
              href="/mcp"
              className={`h-10 px-3 rounded-[12px] flex items-center justify-between text-[14px] font-medium transition-colors ${
                pathname.startsWith('/mcp')
                  ? 'bg-surface dark:bg-surface-2 text-ink shadow-[var(--shadow-1)]'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-3">
                <Plug size={18} strokeWidth={1.75} />
                <span>MCP</span>
              </div>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary-text">
                Soon
              </span>
            </Link>
          )}
        </div>

        {/* Flexible Spacer */}
        <div className="flex-1 min-h-[16px]" />

        {/* Bottom Stack */}
        <div className="flex flex-col gap-2 shrink-0">
          {/* 1) Focalyst Pro Card (only if not Pro) */}
          {!isPro && (
            <>
              {!sidebarCollapsed ? (
                <div
                  className="relative overflow-hidden rounded-[20px] p-4 text-snow shadow-md"
                  style={{
                    background:
                      'radial-gradient(120% 120% at 0% 100%, #1951FC 0%, #0B2CB1 45%, #03195B 100%)',
                  }}
                >
                  <div className="relative z-10">
                    <span className="text-[14px] font-semibold text-snow block">Focalyst Pro</span>
                    <p className="text-[12px] text-snow/70 mt-0.5 mb-3 leading-snug">
                      Unlock everything Focalyst can do.
                    </p>
                    <Button
                      variant="glass"
                      size="sm"
                      className="w-full text-[13px]"
                      onClick={() => router.push('/paywall')}
                    >
                      Upgrade
                    </Button>
                  </div>
                </div>
              ) : (
                <Tooltip content="Focalyst Pro" side="right">
                  <div className="flex justify-center">
                    <IconButton
                      size="md"
                      variant="ghost"
                      onClick={() => router.push('/paywall')}
                    >
                      <Gem size={18} className="text-primary-text" />
                    </IconButton>
                  </div>
                </Tooltip>
              )}
            </>
          )}

          {/* 2) Ask Focalyst AI Row */}
          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleAiDrawer}
              className="h-10 px-3 rounded-[12px] flex items-center justify-between text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-primary-text shrink-0" />
                <span className="text-[14px] font-medium">Ask Focalyst AI</span>
              </div>
              <Kbd>⌘J</Kbd>
            </button>
          ) : (
            <Tooltip content="Ask Focalyst AI ⌘J" side="right">
              <div className="flex justify-center">
                <IconButton size="md" variant="ghost" onClick={toggleAiDrawer}>
                  <Sparkles size={18} className="text-primary-text" />
                </IconButton>
              </div>
            </Tooltip>
          )}

          {/* 3) Settings Row */}
          {!sidebarCollapsed ? (
            <Link
              href="/account"
              className={`h-10 px-3 rounded-[12px] flex items-center gap-3 text-[14px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors ${
                pathname.startsWith('/account') ? 'bg-surface dark:bg-surface-2 text-ink' : ''
              }`}
            >
              <Settings size={18} />
              <span>Settings</span>
            </Link>
          ) : (
            <Tooltip content="Settings" side="right">
              <Link
                href="/account"
                className={`h-10 rounded-[12px] flex items-center justify-center text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors ${
                  pathname.startsWith('/account') ? 'bg-surface dark:bg-surface-2 text-ink' : ''
                }`}
              >
                <Settings size={18} />
              </Link>
            </Tooltip>
          )}

          {/* 4) Divider */}
          <div className="h-px bg-line my-1" />

          {/* 5) ThemeSwitch */}
          {!sidebarCollapsed ? (
            <div className="h-9 w-full flex items-center justify-center">
              <ThemeSwitch />
            </div>
          ) : (
            <Tooltip content="Theme" side="right">
              <div className="flex justify-center">
                <IconButton
                  size="md"
                  variant="ghost"
                  onClick={() => {
                    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
                    setTheme(next);
                  }}
                >
                  <Sun size={18} />
                </IconButton>
              </div>
            </Tooltip>
          )}

          {/* 6) User Row */}
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2 pt-1 px-1">
              <div className="flex items-center gap-2.5 truncate">
                <Avatar size={32} name={fullName} />
                <div className="truncate flex flex-col">
                  <span className="text-[13px] font-semibold text-ink truncate leading-tight">
                    {fullName}
                  </span>
                  <span className="text-[12px] text-ink-3 truncate leading-tight">
                    {userEmail}
                  </span>
                </div>
              </div>
              <IconButton
                size="sm"
                variant="ghost"
                tooltip="Log out"
                onClick={() => signOut()}
              >
                <LogOut size={16} className="text-ink-3 hover:text-danger" />
              </IconButton>
            </div>
          ) : (
            <Popover
              trigger={
                <button type="button" className="flex justify-center w-full">
                  <Avatar size={32} name={fullName} />
                </button>
              }
              side="right"
              align="end"
            >
              <div className="w-56 p-3 flex flex-col gap-2">
                <div>
                  <div className="text-[13px] font-semibold text-ink truncate">{fullName}</div>
                  <div className="text-[12px] text-ink-3 truncate">{userEmail}</div>
                </div>
                <div className="h-px bg-line" />
                <button
                  type="button"
                  onClick={() => router.push('/account')}
                  className="h-8 px-2 rounded-[8px] flex items-center gap-2 text-[13px] text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="h-8 px-2 rounded-[8px] flex items-center gap-2 text-[13px] text-danger hover:bg-danger/10 transition-colors text-left"
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            </Popover>
          )}
        </div>
      </aside>

      {/* =========================================================================
          MAIN COLUMN
          ========================================================================= */}
      <div
        className={`hidden lg:flex flex-col min-h-screen transition-[margin-left] duration-[220ms] ease-[var(--ease)] ${
          sidebarCollapsed ? 'lg:ml-[100px]' : 'lg:ml-[280px]'
        }`}
      >
        {/* Top Bar */}
        <header className="sticky top-3 z-30 mx-3 flex h-16 items-center justify-between rounded-[20px] glass px-4 shadow-[var(--shadow-1)]">
          {/* Left Title / Breadcrumb */}
          <div className="flex items-center min-w-[160px]">{getPageTitle()}</div>

          {/* Center Search Pill (absolutely centered) */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <button
              type="button"
              onClick={toggleCommandPalette}
              className="hidden min-[1180px]:flex w-[360px] h-10 rounded-full bg-surface-2 border border-line px-3.5 items-center justify-between text-[14px] text-ink-3 hover:border-line-strong transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Search size={16} className="text-ink-3" />
                <span>Search or jump to...</span>
              </div>
              <Kbd>⌘K</Kbd>
            </button>
            <button
              type="button"
              onClick={toggleCommandPalette}
              className="flex min-[1180px]:hidden h-10 px-3 rounded-full bg-surface-2 border border-line items-center gap-2 text-[13px] text-ink-3 hover:border-line-strong transition-colors"
            >
              <Search size={16} />
              <Kbd>⌘K</Kbd>
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* + New Button with Popover */}
            <Popover
              open={newMenuOpen}
              onOpenChange={setNewMenuOpen}
              trigger={
                <Button variant="secondary" size="sm" className="gap-1.5 px-3">
                  <Plus size={16} />
                  <span>New</span>
                  <ChevronDown size={14} className="text-ink-3" />
                </Button>
              }
              align="end"
            >
              <div className="w-48 p-1.5 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false);
                    router.push('/plan/new-task');
                  }}
                  className="h-9 px-3 rounded-[8px] flex items-center gap-2 text-[13px] text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <CalendarCheck2 size={15} className="text-ink-2" />
                  <span>New task</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false);
                    router.push('/plan/new-habit');
                  }}
                  className="h-9 px-3 rounded-[8px] flex items-center gap-2 text-[13px] text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <Plus size={15} className="text-ink-2" />
                  <span>New habit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false);
                    router.push('/notes/new');
                  }}
                  className="h-9 px-3 rounded-[8px] flex items-center gap-2 text-[13px] text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <NotebookPen size={15} className="text-ink-2" />
                  <span>New note</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false);
                    router.push('/plan?view=calendar');
                  }}
                  className="h-9 px-3 rounded-[8px] flex items-center gap-2 text-[13px] text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <Bell size={15} className="text-ink-2" />
                  <span>New reminder</span>
                </button>
                <div className="h-px bg-line my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false);
                    router.push('/focus');
                  }}
                  className="h-9 px-3 rounded-[8px] flex items-center gap-2 text-[13px] text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <Timer size={15} className="text-ink-2" />
                  <span>Start focus session</span>
                </button>
              </div>
            </Popover>

            {/* AI Button */}
            <IconButton
              size="md"
              variant="ghost"
              tooltip="Ask Focalyst AI ⌘J"
              onClick={toggleAiDrawer}
            >
              <Sparkles size={18} className="text-primary-text" />
            </IconButton>

            {/* Bell Button (Reminders) */}
            <Popover
              trigger={
                <div className="relative">
                  <IconButton size="md" variant="ghost" tooltip="Reminders">
                    <Bell size={18} />
                  </IconButton>
                  {hasUpcomingReminders && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              }
              align="end"
            >
              <div className="w-[320px] p-4 flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink">Today's Reminders</span>
                {todayReminders.length > 0 ? (
                  <div className="flex flex-col gap-2 mt-1 max-h-[260px] overflow-y-auto">
                    {todayReminders.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 p-2 rounded-[10px] bg-surface-2/60 text-left"
                      >
                        <span className="text-[12px] tabular-nums text-ink-3 shrink-0 font-medium">
                          {r.start_time || 'All day'}
                        </span>
                        <span className="text-[14px] text-ink truncate">{r.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-ink-3 py-4 text-center">
                    You're all caught up.
                  </p>
                )}
              </div>
            </Popover>

            {/* Avatar Menu */}
            <Popover
              trigger={
                <button type="button" className="ml-1 focus:outline-none">
                  <Avatar size={32} name={fullName} />
                </button>
              }
              align="end"
            >
              <div className="w-56 p-2 flex flex-col gap-1">
                <div className="px-2 py-1.5">
                  <div className="text-[13px] font-semibold text-ink truncate">{fullName}</div>
                  <div className="text-[12px] text-ink-3 truncate">{userEmail}</div>
                </div>
                <div className="h-px bg-line my-1" />
                <button
                  type="button"
                  onClick={() => router.push('/account')}
                  className="h-8 px-2 rounded-[8px] flex items-center gap-2 text-[13px] text-ink hover:bg-surface-2 transition-colors text-left"
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </button>
                <div className="h-px bg-line my-1" />
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="h-8 px-2 rounded-[8px] flex items-center gap-2 text-[13px] text-danger hover:bg-danger/10 transition-colors text-left"
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            </Popover>
          </div>
        </header>

        {/* Page Content Container & Optional Context Panel */}
        <div className="flex flex-1">
          <main className="mx-auto w-full max-w-[1440px] px-8 pt-6 pb-8 flex-1">
            {children}
          </main>

          {/* Context Panel slot (340px) */}
          {contextPanel !== null && isContextPanelOpen && (
            <aside className="w-[340px] shrink-0 border-l border-line p-6">
              {contextPanel}
            </aside>
          )}
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onToggleSidebar={toggleSidebar}
        onToggleAiDrawer={toggleAiDrawer}
      />

      {/* Global AI Drawer */}
      <AIDrawer open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
    </div>
  );
}
