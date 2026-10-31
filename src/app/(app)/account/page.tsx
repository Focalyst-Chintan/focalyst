'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import ReactMarkdown from 'react-markdown'
import DarkModeToggle from '@/components/profile/DarkModeToggle'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'

import {
    ArrowLeftIcon,
    BellIcon,
    CycleIcon,
    TimerIcon,
    GlobeIcon,
    MoonIcon,
    ChevronRightIcon,
    DiamondIcon,
} from '@/components/icons'
import { LogOut, Plug, Trash2 } from 'lucide-react';
import { MSwitch, SectionHeader } from '@/components/mobile/ui';
import { User } from '@/types';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import DesktopSettingsView from '@/components/desktop/settings/DesktopSettingsView';
import { openBillingPortal } from '@/lib/billing/checkout';
import { useToast, GlobalToastContainer } from '@/components/desktop/ui/Toast';

export default function AccountPage() {
    const isDesktop = useIsDesktop();
    const router = useRouter()
    const supabase = createClient()
    const { user: authUser, isLoading: authLoading } = useAuth()
    const { t, i18n } = useTranslation()
    const toast = useToast()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    if (isDesktop) {
        return <DesktopSettingsView />;
    }

    const [isEditing, setIsEditing] = useState(false)
    const [editFullName, setEditFullName] = useState('')
    const [editProfileType, setEditProfileType] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccessMessage, setSaveSuccessMessage] = useState('')

    const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null)
    const [accordionContent, setAccordionContent] = useState<Record<string, string>>({})
    const [isNative, setIsNative] = useState(false)

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform())
    }, [])

    useEffect(() => {
        if (authLoading) return

        if (!authUser) {
            setLoading(false)
            return
        }

        const currentUserId = authUser.id

        async function fetchUser() {
            try {
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('id, email, full_name, avatar_url, profile_type, plan, plan_expires_at, billing_provider, onboarding_done, created_at')
                    .eq('id', currentUserId)
                    .single()

                if (error) {
                    // Log the error so it's visible in the Xcode/Safari console
                    console.error('[Profile] Supabase fetch error:', error.message, error)
                } else {
                    setUser(profile)
                    setEditFullName(profile?.full_name || '')
                    setEditProfileType(profile?.profile_type || 'professional')
                }
            } catch (err) {
                console.error('[Profile] Unexpected error fetching user:', err)
            } finally {
                // Always resolve the loading state — prevents infinite spinner
                setLoading(false)
            }
        }
        fetchUser()
    }, [supabase, authUser, authLoading])

    const handleSaveProfile = async () => {
        if (!user) return
        setIsSaving(true)
        setSaveSuccessMessage('')

        const updatedUser = { ...user, full_name: editFullName, profile_type: editProfileType as User['profile_type'] }

        const { error } = await supabase
            .from('users')
            .update({ full_name: editFullName, profile_type: editProfileType })
            .eq('id', user.id)

        if (error) {
            console.error('Error saving profile:', error)
        } else {
            setUser(updatedUser)
            setSaveSuccessMessage(t('settings.profileSaved'))
            setTimeout(() => setSaveSuccessMessage(''), 3000)
            setIsEditing(false)
        }
        setIsSaving(false)
    }

    const toggleAccordion = async (id: string, filename: string) => {
        if (expandedAccordion === id) {
            setExpandedAccordion(null)
            return
        }

        setExpandedAccordion(id)

        if (!accordionContent[id]) {
            try {
                const res = await fetch(`/support/${filename}`)
                const content = res.ok ? await res.text() : 'Failed to load content. Please try again later.'
                setAccordionContent(prev => ({ ...prev, [id]: content }))
            } catch (err) {
                console.error(err)
                setAccordionContent(prev => ({ ...prev, [id]: 'Failed to load content. Please try again later.' }))
            }
        }
    }

    const handleToggle = async (field: keyof User, value: boolean) => {
        if (!user) return

        const updatedUser = { ...user, [field]: value }
        setUser(updatedUser)

        const { error } = await supabase
            .from('users')
            // @ts-ignore
            .update({ [field]: value })
            .eq('id', user.id)

        if (error) {
            console.error('Error updating preference:', error)
            // Rollback on error
            setUser(user)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            }
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`
            }

            const res = await fetch('/api/account/delete', {
                method: 'POST',
                headers,
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to delete account')
            }

            // Account deleted — sign out and redirect
            await supabase.auth.signOut()
            router.push('/login')
        } catch (err: any) {
            console.error('[ACCOUNT_DELETE] Error:', err?.message)
            alert(err?.message || 'Failed to delete account. Please try again or contact support.')
        }
    }

    if (loading) {
        return <LoadingSpinner />
    }

    return (
        <main className="min-h-dvh pb-6">
            {/* Header */}
            <header
                className="flex items-center justify-between px-5 h-14"
            >
                <button onClick={() => router.back()} className="m-icon-btn m-press -ml-1" aria-label="Back">
                    <ArrowLeftIcon size={20} color="currentColor" />
                </button>
                <h1 className="m-title-1 text-ink absolute left-1/2 -translate-x-1/2">
                    {t('settings.profile')}
                </h1>
                <div className="w-11" /> {/* Placeholder for balance */}
            </header>

            <div className="px-5 pt-4 flex flex-col items-center">
                {/* Profile Photo */}
                <div className="relative">
                    <div className="w-[72px] h-[72px] rounded-full bg-[image:var(--m-grad-primary)] overflow-hidden ring-1 ring-line flex items-center justify-center text-snow text-[28px] font-semibold">
                        {user?.avatar_url ? (
                            <Image
                                src={user.avatar_url}
                                alt={user?.full_name || 'User'}
                                width={72}
                                height={72}
                                sizes="72px"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span aria-hidden>{(user?.full_name || user?.email || '?').trim().charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <div className="w-full max-w-sm mt-5 flex flex-col gap-4">
                        <div>
                            <label className="m-label">{t('settings.fullName')}</label>
                            <input
                                type="text"
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="m-input"
                            />
                        </div>
                        <div>
                            <label className="m-label">{t('settings.profileType')}</label>
                            <select
                                value={editProfileType}
                                onChange={(e) => setEditProfileType(e.target.value)}
                                className="m-input appearance-none"
                            >
                                <option value="student">{t('settings.student')}</option>
                                <option value="professional">{t('settings.professional')}</option>
                                <option value="freelancer">{t('settings.freelancer')}</option>
                                <option value="creator">{t('settings.creator')}</option>
                                <option value="entrepreneur">{t('settings.entrepreneur')}</option>
                            </select>
                        </div>
                        <div className="flex gap-3 mt-1">
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                                className="m-btn m-btn-secondary m-press flex-1"
                            >
                                {t('settings.cancel')}
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="m-btn m-btn-primary m-press flex-1"
                            >
                                {isSaving ? t('settings.saving') : t('settings.saveChanges')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="m-title-2 text-ink mt-4 text-center">{user?.full_name || 'No name yet'}</h2>
                        <p className="m-subhead !font-normal text-ink-2 mt-1">{user?.email}</p>
                        <div className="flex items-center gap-2 mt-3">
                            {user?.plan === 'free' ? (
                                <span className="m-chip m-chip-neutral">{t('settings.free')}</span>
                            ) : (
                                <span className="m-chip m-chip-info">Pro</span>
                            )}
                            {user?.profile_type && (
                                <span className="m-chip m-chip-neutral capitalize">
                                    {t(`settings.${user.profile_type}`, user.profile_type.replace('_', ' '))}
                                </span>
                            )}
                        </div>
                        {saveSuccessMessage && (
                            <p role="status" className="m-footnote text-[var(--m-success-text)] mt-2">{saveSuccessMessage}</p>
                        )}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="m-btn m-btn-secondary m-btn-sm m-press mt-4"
                        >
                            {t('settings.editProfile')}
                        </button>
                    </>
                )}

                {/* My Plan Card */}
                <div className="w-full rounded-[24px] p-6 mt-8 relative overflow-hidden bg-[image:var(--m-grad-brand)] text-snow shadow-[var(--m-glow)]">
                    <div className="relative z-10">
                        <p className="m-footnote text-snow/80">{t('settings.plan')}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <h3 className="m-title-2 text-snow">
                                {user?.plan === 'free' ? t('settings.free') : user?.plan === 'lifetime' ? t('settings.lifetime', 'Lifetime') : t('settings.pro', 'Pro')}
                            </h3>
                            {user?.plan !== 'free' && user?.plan !== 'lifetime' && (
                                <span className="bg-snow/20 text-snow m-caption px-2 h-6 inline-flex items-center rounded-full">
                                    {user?.plan === 'pro_yearly' ? t('settings.annual', 'Annual') : t('settings.monthly', 'Monthly')}
                                </span>
                            )}
                        </div>
                        <p className="m-footnote text-snow/75 mt-1">
                            {user?.plan === 'lifetime' ? t('settings.focusForever', 'Focus forever') : `${t('settings.renewalDate', 'Renewal Date')}: Dec 12, 2026`}
                        </p>

                        <button
                            onClick={async () => {
                                if (!user?.plan || user.plan === 'free') {
                                    router.push('/paywall');
                                    return;
                                }
                                if ((user as any).billing_provider === 'apple') {
                                    toast.show('Your plan is managed in the App Store', 'info');
                                } else if ((user as any).billing_provider === 'google') {
                                    toast.show('Your plan is managed in Google Play', 'info');
                                } else {
                                    const res = await openBillingPortal();
                                    if (!res.ok) {
                                        toast.show(res.message || 'Could not open billing portal', 'error');
                                    }
                                }
                            }}
                            className="m-btn m-press w-full mt-5 bg-snow text-[#0B2CB1] hover:bg-snow/90"
                        >
                            {!user?.plan || user.plan === 'free' ? t('settings.upgrade', 'Upgrade to Pro') : t('settings.manage', 'Manage plan')}
                        </button>
                    </div>
                    {/* Background Decorative Icon */}
                    <div aria-hidden className="absolute top-2 -right-4 opacity-10">
                        <DiamondIcon size={120} color="#FFFFFF" />
                    </div>
                </div>

                {/* Preferences */}
                <div className="w-full mt-7">
                    <SectionHeader label={t('settings.preferences')} as="h3" />
                    <div className="m-glass overflow-hidden">
                        {isNative && (
                            <>
                                <PreferenceRow
                                    icon={<BellIcon size={20} color="currentColor" />}
                                    iconBg="text-ink-2"
                                    label={t('settings.taskRemindersSoon', 'Task Reminders (Soon)')}
                                    value={false}
                                    onChange={() => { }}
                                />
                                <PreferenceRow
                                    icon={<CycleIcon size={20} color="currentColor" />}
                                    iconBg="text-ink-2"
                                    label={t('settings.habitRemindersSoon', 'Habit Reminders (Soon)')}
                                    value={false}
                                    onChange={() => { }}
                                />
                            </>
                        )}
                        <PreferenceRow
                            icon={<TimerIcon size={20} color="currentColor" />}
                            iconBg="text-ink-2"
                            label={t('settings.pomodoroAlertsSoon', 'Pomodoro Alerts (Soon)')}
                            value={false}
                            onChange={() => { }}
                        />
                        <div className="flex items-center justify-between gap-3 min-h-14 px-4 border-t border-line">
                            <div className="flex items-center gap-3">
                                <span className="m-tile !w-9 !h-9 text-ink-2">
                                    <GlobeIcon size={18} color="currentColor" />
                                </span>
                                <span className="m-callout text-ink">{t('settings.language')}</span>
                            </div>
                            <div className="flex items-center gap-1 text-ink-2">
                                <div className="relative">
                                    <select
                                        value={i18n.language || 'en'}
                                        onChange={(e) => {
                                            const lang = e.target.value;
                                            i18n.changeLanguage(lang);
                                            localStorage.setItem('language', lang);
                                        }}
                                        className="bg-transparent text-[16px] text-ink-2 outline-none pr-6 pl-2 min-h-11 appearance-none cursor-pointer text-right"
                                    >
                                        <option value="en" className="bg-[var(--m-surface)] text-ink">English</option>
                                        <option value="es" className="bg-[var(--m-surface)] text-ink">Español</option>
                                        <option value="fr" className="bg-[var(--m-surface)] text-ink">Français</option>
                                        <option value="de" className="bg-[var(--m-surface)] text-ink">Deutsch</option>
                                        <option value="ja" className="bg-[var(--m-surface)] text-ink">日本語</option>
                                        <option value="ko" className="bg-[var(--m-surface)] text-ink">한국어</option>
                                        <option value="zh-CN" className="bg-[var(--m-surface)] text-ink">简体中文</option>
                                        <option value="hi" className="bg-[var(--m-surface)] text-ink">हिन्दी</option>
                                    </select>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-ink-2">
                                        <ChevronRightIcon size={18} color="currentColor" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DarkModeToggle />
                    </div>
                </div>

                {/* AI connections */}
                <div className="w-full mt-7">
                    <SectionHeader label="AI" as="h3" />
                    <div className="m-glass overflow-hidden">
                        <Link href="/settings?tab=connections" className="m-press flex items-center justify-between gap-3 min-h-14 px-4 hover:bg-[var(--m-surface-strong)] cursor-pointer">
                            <span className="flex items-center gap-3">
                                <span className="m-tile !w-9 !h-9 text-ink-2">
                                    <Plug className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                                </span>
                                <span className="m-callout text-ink">AI connections</span>
                            </span>
                            <ChevronRightIcon size={18} color="currentColor" className="text-ink-2" />
                        </Link>
                    </div>
                </div>

                {/* Support */}
                <div className="w-full mt-7">
                    <SectionHeader label={t('settings.support')} as="h3" />
                    <div className="m-glass overflow-hidden">
                        <SupportLink
                            label="How to use Focalyst"
                            to="/how-to"
                        />
                        <SupportLink
                            label={t('settings.downloadApp', 'Download the App')}
                            to="/app"
                        />
                        <SupportLink
                            label={t('settings.faq')}
                            onClick={() => toggleAccordion('faq', 'focalyst-help-faq.md')}
                            isExpanded={expandedAccordion === 'faq'}
                            expandContent={accordionContent['faq']}
                        />
                        <SupportLink
                            label={t('settings.contact')}
                            href="https://www.chintan.store/emaillist"
                        />
                        <SupportLink
                            label={t('settings.privacy', 'Privacy Policy')}
                            to="/privacy"
                        />
                        <SupportLink
                            label={t('settings.terms', 'Terms of Service')}
                            to="/terms"
                        />
                    </div>
                </div>

                {/* Account actions: destructive rows last */}
                <div className="w-full mt-7">
                    <SectionHeader label="Account" as="h3" />
                    <div className="m-glass overflow-hidden">
                        <button
                            onClick={handleLogout}
                            className="m-press w-full flex items-center gap-3 min-h-14 px-4 text-left hover:bg-[var(--m-surface-strong)]"
                        >
                            <span className="m-tile !w-9 !h-9 text-[var(--m-danger-text)]">
                                <LogOut size={18} strokeWidth={1.75} aria-hidden />
                            </span>
                            <span className="m-callout text-[var(--m-danger-text)]">{t('settings.logout')}</span>
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="m-press w-full flex items-center gap-3 min-h-14 px-4 text-left border-t border-line hover:bg-[var(--m-surface-strong)]"
                        >
                            <span className="m-tile !w-9 !h-9 text-[var(--m-danger-text)]">
                                <Trash2 size={18} strokeWidth={1.75} aria-hidden />
                            </span>
                            <span className="m-callout text-[var(--m-danger-text)]">{t('settings.deleteAccount')}</span>
                        </button>
                    </div>
                </div>

                {/* Version & Credits */}
                <div className="mt-8 mb-4 text-center">
                    <p className="m-caption text-ink-2">{t('settings.version')}</p>
                    <p className="m-caption text-ink-2 mt-1">{t('settings.builtBy')}</p>
                </div>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-labelledby="delete-title">
                    <div className="absolute inset-0 m-backdrop" onClick={() => setShowDeleteModal(false)} />
                    <div className="m-sheet !rounded-[28px] !border w-full max-w-[360px] p-6 relative z-10 shadow-[var(--shadow-glass)]">
                        <h3 id="delete-title" className="m-title-2 text-ink">{t('settings.deleteAccountConfirmTitle')}</h3>
                        <p className="m-footnote text-ink-2 mt-2">
                            {t('settings.deleteAccountConfirmDesc')}
                        </p>
                        <p className="m-footnote text-ink mt-4">
                            {t('settings.deleteAccountConfirmType')}
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={t('settings.typeDelete')}
                            className="m-input mt-2"
                        />
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="m-btn m-btn-secondary m-press flex-1"
                            >
                                {t('settings.cancel')}
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE'}
                                className="m-btn m-btn-danger m-press flex-1"
                            >
                                {t('settings.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <GlobalToastContainer />
        </main>
    )
}

function PreferenceRow({
    icon,
    iconBg,
    label,
    value,
    onChange
}: {
    icon: React.ReactNode,
    iconBg: string,
    label: string,
    value: boolean,
    onChange: (val: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between gap-3 min-h-14 px-4 border-b border-line last:border-0">
            <div className="flex items-center gap-3 min-w-0">
                <span className={`m-tile !w-9 !h-9 ${iconBg}`}>
                    {icon}
                </span>
                <span className="m-callout text-ink">{label}</span>
            </div>
            {/* Custom Toggle */}
            <MSwitch checked={value} onClick={() => onChange(!value)} label={label} />
        </div>
    )
}

function SupportLink({ label, href, to, onClick, isExpanded, expandContent }: { label: string, href?: string, to?: string, onClick?: () => void, isExpanded?: boolean, expandContent?: string }) {
    if (to) {
        return (
            <Link href={to} className="m-press flex items-center justify-between gap-3 min-h-14 px-4 border-b border-line last:border-0 hover:bg-[var(--m-surface-strong)] cursor-pointer">
                <span className="m-callout text-ink">{label}</span>
                <ChevronRightIcon size={18} color="currentColor" className="text-ink-2" />
            </Link>
        )
    }

    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="m-press flex items-center justify-between gap-3 min-h-14 px-4 border-b border-line last:border-0 hover:bg-[var(--m-surface-strong)]">
                <span className="m-callout text-ink">{label}</span>
                <ChevronRightIcon size={18} color="currentColor" className="text-ink-2" />
            </a>
        )
    }

    if (onClick) {
        return (
            <div className="border-b border-line last:border-0">
                <div onClick={onClick} className="m-press flex items-center justify-between gap-3 min-h-14 px-4 hover:bg-[var(--m-surface-strong)] cursor-pointer">
                    <span className="m-callout text-ink">{label}</span>
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRightIcon size={18} color="currentColor" className="text-ink-2" />
                    </div>
                </div>
                {isExpanded && (
                    <div className="p-4 border-t border-line m-footnote text-ink">
                        {expandContent ? (
                            <ReactMarkdown
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-ink mt-4 mb-2" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-base font-semibold text-ink mt-4 mb-2" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-[15px] font-medium text-ink mt-3 mb-1" {...props} />,
                                    p: ({ node, ...props }) => <p className="text-[13px] text-ink-2 mb-3 leading-relaxed" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 text-[13px] text-ink-2" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 text-[13px] text-ink-2" {...props} />,
                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-primary-text hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-ink" {...props} />,
                                    hr: ({ node, ...props }) => <hr className="border-line my-4" {...props} />,
                                }}
                            >
                                {expandContent}
                            </ReactMarkdown>
                        ) : (
                            <div className="flex items-center justify-center p-4">
                                <div className="animate-pulse bg-[var(--m-surface-strong)] w-8 h-8 rounded-full" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="m-press flex items-center justify-between gap-3 min-h-14 px-4 border-b border-line last:border-0 hover:bg-[var(--m-surface-strong)] cursor-pointer">
            <span className="m-callout text-ink">{label}</span>
            <ChevronRightIcon size={18} color="currentColor" className="text-ink-2" />
        </div>
    )
}

function LoadingSpinner() {
    return (
        <div className="px-5 pt-6 flex flex-col items-center" aria-hidden>
            <div className="m-skel w-[72px] h-[72px] !rounded-full" />
            <div className="m-skel h-7 w-40 mt-4 !rounded-lg" />
            <div className="m-skel h-4 w-52 mt-2 !rounded-md" />
            <div className="m-skel h-[170px] w-full mt-8 !rounded-[24px]" />
            <div className="m-skel h-[168px] w-full mt-7 !rounded-[24px]" />
        </div>
    )
}

