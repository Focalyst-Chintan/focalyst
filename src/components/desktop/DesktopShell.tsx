'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { HabitModal } from './plan/HabitModal';
import { ReminderModal } from './plan/ReminderModal';
import { useDesktopShortcuts } from '@/hooks/useDesktopShortcuts';
import { useTheme } from 'next-themes';
import { getDisplayName } from '@/lib/utils/name';
import { CreateProvider, useCreate } from '@/components/desktop/create/CreateProvider';

const BRAND_LOGO = '/small-logo.png';

function SidebarBrand({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Expand sidebar"
        className="group relative mx-auto flex h-10 w-10 items-center justify-center rounded-xl hover:bg-surface-2"
      >
        <Image
          src={BRAND_LOGO}
          alt=""
          width={32}
          height={32}
          priority
          className="h-8 w-8 rounded-[9px] object-cover transition-opacity duration-150 group-hover:opacity-0"
        />
        <PanelLeft
          size={18}
          strokeWidth={1.75}
          className="absolute text-ink-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </button>
    );
  }
  return (
    <div className="flex h-12 items-center justify-between">
      <Link href="/today" className="flex items-center gap-2.5" aria-label="Focalyst home">
        <Image
          src={BRAND_LOGO}
          alt=""
          width={28}
          height={28}
          priority
          className="h-7 w-7 rounded-[8px] object-cover"
        />
        <span className="text-[13px] font-semibold tracking-[0.32em] text-ink">FOCALYST</span>
      </Link>
      <IconButton label="Collapse sidebar" tooltip="Collapse ⌘\" onClick={onToggle}>
        <PanelLeft size={18} strokeWidth={1.75} />
      </IconButton>
    </div>
  );
}

function SidebarItem({
  href,
  onClick,
  icon: Icon,
  label,
  active,
  collapsed,
  trailing,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed: boolean;
  trailing?: React.ReactNode;
}) {
  const cls = `relative z-10 flex h-10 items-center rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
    collapsed ? 'mx-auto w-10 justify-center' : 'w-full gap-3 px-3'
  } ${
    active
      ? 'bg-transparent text-ink font-medium'
      : 'text-ink-2 hover:bg-surface-2/60 hover:text-ink'
  }`;

  const inner = (
    <>
      <Icon
        size={18}
        strokeWidth={1.75}
        className={`shrink-0 ${active ? 'text-primary-text' : 'text-current'}`}
      />
      {!collapsed && <span className="flex-1 truncate text-[14px] font-medium">{label}</span>}
      {!collapsed && trailing}
    </>
  );

  const el = href ? (
    <Link
      href={href}
      data-active={active ? 'true' : 'false'}
      className={cls}
      aria-label={collapsed ? label : undefined}
    >
      {inner}
    </Link>
  ) : (
    <button
      type="button"
      data-active={active ? 'true' : 'false'}
      onClick={onClick}
      className={cls}
      aria-label={collapsed ? label : undefined}
    >
      {inner}
    </button>
  );

  return collapsed ? (
    <Tooltip content={label} side="right">
      {el}
    </Tooltip>
  ) : (
    el
  );
}

export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <CreateProvider>
      <DesktopShellInner>{children}</DesktopShellInner>
    </CreateProvider>
  );
}

function DesktopShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, plan, signOut } = useAuth();
  const { reminders } = usePlan();
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
    setContextPanel,
    isContextPanelOpen,
    setIsContextPanelOpen,
    toggleContextPanel,
    habitModalOpen,
    setHabitModalOpen,
    editingHabit,
    openNewHabitModal,
    reminderModalOpen,
    setReminderModalOpen,
    editingReminder,
    reminderPrefillDate,
    openNewReminderModal,
    triggerComposerFocus,
  } = useDesktopShell();

  const create = useCreate();

  // Scope context panel to route: clear and close on every route change, only Plan (and Notes) may open it
  useEffect(() => {
    if (!pathname.startsWith('/plan') && !pathname.startsWith('/notes')) {
      setContextPanel(null);
      setIsContextPanelOpen(false);
    }
  }, [pathname, setContextPanel, setIsContextPanelOpen]);

  // Track viewport width for context panel responsive push vs overlay
  const [isWideScreen, setIsWideScreen] = useState(true);
  const contextPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkWidth = () => {
      setIsWideScreen(window.innerWidth >= 1280);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Esc closes context panel when focus is inside it
  const handleContextPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsContextPanelOpen(false);
    }
  };

  // Register Global Desktop Shortcuts
  useDesktopShortcuts({
    onToggleCommandPalette: toggleCommandPalette,
    onToggleAiDrawer: toggleAiDrawer,
    onToggleSidebar: toggleSidebar,
    onToggleContextPanel: toggleContextPanel,
    onOpenNewMenu: toggleNewMenu,
    onNewHabit: () => create.open('habit'),
    onNewReminder: () => create.open('reminder'),
    onFocusTasksComposer: () => {
      create.open('task');
    },
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
  const fullName = useMemo(() => getDisplayName(profile, user), [profile, user]);
  const userEmail = user?.email || '';

  // Calculate upcoming reminders for today
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayReminders = useMemo(() => {
    return (reminders || []).filter((r: any) => (r.day || r.date) === todayStr);
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

  const isPlanActive = pathname.startsWith('/plan');
  const currentPlanView = searchParams.get('view') || 'habits';

  // Sliding indicator for sidebar nav
  const navListRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const el = navListRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    setInd(el ? { top: el.offsetTop, height: el.offsetHeight } : null);
  }, [pathname, searchParams, sidebarCollapsed]);

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
    <div
      className="relative min-h-screen w-full lg:bg-transparent text-ink font-ui antialiased lg:overflow-x-clip"
      style={{
        ['--sb-pad' as any]: sidebarCollapsed ? '18px' : '16px',
      }}
    >
      {/* Ambient Canvas background fixed at z-0 */}
      <div className="hidden lg:block fixed inset-0 z-0">
        <AmbientBackground />
      </div>

      <div className="relative z-10 flex min-h-screen w-full">
        {/* =========================================================================
            DESKTOP SIDEBAR
            ========================================================================= */}
        <aside
          className={`fixed top-3 left-3 bottom-3 z-40 hidden lg:flex flex-col rounded-[28px] glass-strong liquid transition-[width] duration-[220ms] ease-[var(--ease)] overflow-hidden shadow-[var(--shadow-2)] ${
            sidebarCollapsed ? 'w-[76px] items-center px-[18px] py-4' : 'w-[256px] p-4'
          }`}
        >
          {/* Top Brand Row */}
          <div className={sidebarCollapsed ? 'w-full shrink-0' : 'w-full shrink-0'}>
            <SidebarBrand collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
          </div>

          {/* Primary Navigation with sliding active pill & glowing left bar */}
          <nav
            ref={navListRef}
            className={`relative mt-6 flex flex-col gap-1 shrink-0 ${
              sidebarCollapsed ? 'w-full items-center' : 'w-full'
            }`}
          >
            {ind && (
              <>
                <span
                  aria-hidden
                  className={`fx-active-pill pointer-events-none absolute transition-[transform,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    sidebarCollapsed ? 'left-1/2 w-10 -translate-x-1/2' : 'inset-x-0'
                  }`}
                  style={{ transform: `translateY(${ind.top}px)`, height: ind.height }}
                />
                <span
                  aria-hidden
                  className="fx-nav-bar pointer-events-none absolute transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    left: 'calc(-1 * var(--sb-pad))',
                    transform: `translateY(${ind.top + 10}px)`,
                    height: Math.max(0, ind.height - 20),
                  }}
                />
              </>
            )}

            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <React.Fragment key={item.href}>
                  <SidebarItem
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={active}
                    collapsed={sidebarCollapsed}
                  />

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

          {/* Hairline group divider between main nav and LABS */}
          <div className="mx-3 my-3 h-px bg-line shrink-0" />

          {/* LABS Section */}
          <div className={`flex flex-col shrink-0 ${sidebarCollapsed ? 'w-full items-center' : 'w-full'}`}>
            {!sidebarCollapsed && (
              <span className="text-[11px] leading-[14px] font-medium uppercase tracking-[0.08em] text-ink-3 px-3 mb-2">
                LABS
              </span>
            )}

            <SidebarItem
              href="/mcp"
              icon={Plug}
              label="MCP"
              active={pathname.startsWith('/mcp')}
              collapsed={sidebarCollapsed}
              trailing={
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary-text">
                  Soon
                </span>
              }
            />
          </div>

          {/* Flexible Spacer */}
          <div className="flex-1 min-h-[16px]" />

          {/* Hairline group divider before bottom stack */}
          <div className="mx-3 my-2 h-px bg-line shrink-0" />

          {/* Bottom Stack */}
          <div className={`flex flex-col gap-2 shrink-0 ${sidebarCollapsed ? 'w-full items-center' : 'w-full'}`}>
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
                        variant="onDark"
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
                    <button
                      type="button"
                      onClick={() => router.push('/paywall')}
                      aria-label="Focalyst Pro"
                      className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-primary-text hover:bg-surface-2 transition-colors"
                    >
                      <Gem size={18} strokeWidth={1.75} />
                    </button>
                  </Tooltip>
                )}
              </>
            )}

            {/* 2) Ask Focalyst AI Row */}
            <SidebarItem
              onClick={toggleAiDrawer}
              icon={Sparkles}
              label="Ask Focalyst AI"
              collapsed={sidebarCollapsed}
              trailing={<Kbd>⌘J</Kbd>}
            />

            {/* 3) Settings Row */}
            <SidebarItem
              href="/account"
              icon={Settings}
              label="Settings"
              active={pathname.startsWith('/account')}
              collapsed={sidebarCollapsed}
            />

            {/* 4) Divider */}
            <div className={sidebarCollapsed ? 'mx-auto my-1 h-px w-8 bg-line' : 'h-px bg-line my-1'} />

            {/* 5) ThemeSwitch */}
            {!sidebarCollapsed ? (
              <div className="w-full">
                <ThemeSwitch className="w-full h-9" />
              </div>
            ) : (
              <Tooltip content="Theme" side="right">
                <button
                  type="button"
                  aria-label="Theme"
                  onClick={() => {
                    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
                    setTheme(next);
                  }}
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 transition-colors"
                >
                  <Sun size={18} strokeWidth={1.75} />
                </button>
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
                  <div className="mx-auto flex h-10 w-10 items-center justify-center">
                    <Avatar size={32} name={fullName} />
                  </div>
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
          className={`hidden lg:flex flex-col flex-1 min-h-screen px-6 transition-[margin-left] duration-[220ms] ease-[var(--ease)] ${
            sidebarCollapsed ? 'lg:ml-[100px]' : 'lg:ml-[280px]'
          }`}
        >
          {/* F1: Sticky Top Bar with Backdrop Blur Wrapper */}
          <div className="sticky top-0 z-30 pt-3 pb-3">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-full bg-canvas/70 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_65%,transparent)]"
            />
            <header className="relative z-10 flex h-16 w-full items-center justify-between rounded-[20px] glass-strong px-4 shadow-[var(--shadow-1)]">
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
                {/* + New Button with Popover routed to useCreate */}
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
                        create.open('task');
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
                        create.open('habit');
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
                        create.open('note');
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
                        create.open('reminder');
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
                        create.open('focus');
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
          </div>

          {/* Page Content Container & Optional Context Panel */}
          <div className="flex flex-1 w-full gap-6 pb-8 items-start">
            <main className="mx-auto w-full max-w-[1440px] pt-3 flex-1 min-w-0">
              {children}
            </main>

            {/* Context Panel slot (340px) */}
            {/* At >=1280px it pushes content; at 1024-1279px it overlays as a Drawer */}
            {contextPanel !== null && isContextPanelOpen && (
              <>
                {isWideScreen ? (
                  <aside
                    ref={contextPanelRef}
                    onKeyDown={handleContextPanelKeyDown}
                    tabIndex={-1}
                    className="w-[340px] shrink-0 frost rounded-[20px] p-5 sticky top-[88px] max-h-[calc(100vh-104px)] overflow-y-auto transition-all duration-220 ease-[var(--ease)] focus:outline-none"
                  >
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
                      <h3 className="text-[15px] font-semibold text-ink">Details</h3>
                      <IconButton
                        label="Close panel"
                        tooltip="Close ⌘."
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsContextPanelOpen(false)}
                      >
                        <PanelLeft size={16} />
                      </IconButton>
                    </div>
                    {contextPanel}
                  </aside>
                ) : (
                  <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex justify-end"
                  >
                    <div
                      onClick={() => setIsContextPanelOpen(false)}
                      className="fixed inset-0 bg-[#05070F]/40 backdrop-blur-sm transition-opacity duration-200"
                    />
                    <aside
                      ref={contextPanelRef}
                      onKeyDown={handleContextPanelKeyDown}
                      tabIndex={-1}
                      className="relative z-10 h-full w-[340px] max-w-full glass-strong shadow-2xl p-6 flex flex-col overflow-y-auto transition-transform duration-220 ease-out animate-in slide-in-from-right focus:outline-none"
                    >
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
                        <h3 className="text-[15px] font-semibold text-ink">Details</h3>
                        <IconButton
                          label="Close panel"
                          tooltip="Close ⌘."
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsContextPanelOpen(false)}
                        >
                          <PanelLeft size={16} />
                        </IconButton>
                      </div>
                      {contextPanel}
                    </aside>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onToggleSidebar={toggleSidebar}
        onToggleAiDrawer={toggleAiDrawer}
        onNewHabit={openNewHabitModal}
        onNewReminder={() => openNewReminderModal()}
        onFocusTasksComposer={() => {
          if (!pathname.startsWith('/plan')) {
            router.push('/plan?view=tasks');
          }
          triggerComposerFocus();
        }}
      />

      {/* Global AI Drawer */}
      <AIDrawer open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />

      {/* Desktop Habit Modal */}
      <HabitModal
        isOpen={habitModalOpen}
        onClose={() => setHabitModalOpen(false)}
        habitToEdit={editingHabit}
      />

      {/* Desktop Reminder Modal */}
      <ReminderModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        reminderToEdit={editingReminder}
        prefillDate={reminderPrefillDate}
      />
    </div>
  );
}
