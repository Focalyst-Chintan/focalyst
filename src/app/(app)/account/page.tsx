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
    UserAccountIcon
} from '@/components/icons'
import { Plug } from 'lucide-react';
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
        <main className="min-h-screen bg-page-bg dark:bg-slate-950 pb-20 transition-colors duration-300">
            {/* Header */}
            <header 
                style={{ 
                    paddingTop: 'env(safe-area-inset-top)',
                    height: 'calc(56px + env(safe-area-inset-top))' 
                }}
                className="bg-white dark:bg-slate-900 border-b border-card-bg/50 dark:border-slate-800 flex items-center justify-between px-5 sticky top-0 z-30 transition-colors duration-300"
            >
                <button onClick={() => router.back()} className="p-1 -ml-1 text-navy dark:text-slate-400">
                    <ArrowLeftIcon size={24} color="currentColor" />
                </button>
                <h1 className="text-navy dark:text-slate-100 text-[16px] font-bold tracking-[0.15em] absolute left-1/2 -translate-x-1/2">
                    {t('settings.profile')}
                </h1>
                <div className="w-8" /> {/* Placeholder for balance */}
            </header>

            <div className="px-5 pt-8 flex flex-col items-center">
                {/* Profile Photo */}
                <div className="relative">
                    <div className="w-[64px] h-[64px] rounded-full bg-card-bg dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-950 shadow-sm flex items-center justify-center">
                        {user?.avatar_url ? (
                            <Image
                                src={user.avatar_url}
                                alt={user?.full_name || 'User'}
                                width={64}
                                height={64}
                                sizes="32px"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <UserAccountIcon size={32} color="#95A7B5" />
                        )}
                    </div>
                    <div className={`absolute -bottom-1 -right-2 ${user?.plan === 'free' ? 'bg-card-bg dark:bg-slate-800 text-navy dark:text-slate-200' : 'bg-accent text-white'} text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white dark:border-slate-950`}>
                        {user?.plan === 'free' ? t('settings.free') : 'PRO'}
                    </div>

                </div>

                {isEditing ? (
                    <div className="w-full max-w-sm mt-4 flex flex-col gap-3">
                        <div>
                            <label className="text-navy dark:text-slate-300 text-[12px] opacity-80 font-semibold ml-1">{t('settings.fullName')}</label>
                            <input
                                type="text"
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="w-full h-11 bg-white dark:bg-slate-800 border border-card-bg/30 dark:border-slate-700 rounded-xl px-4 text-[14px] text-navy dark:text-slate-200 outline-none focus:border-accent shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="text-navy dark:text-slate-300 text-[12px] opacity-80 font-semibold ml-1">{t('settings.profileType')}</label>
                            <select
                                value={editProfileType}
                                onChange={(e) => setEditProfileType(e.target.value)}
                                className="w-full h-11 bg-white dark:bg-slate-800 border border-card-bg/30 dark:border-slate-700 rounded-xl px-4 text-[14px] text-navy dark:text-slate-200 outline-none focus:border-accent shadow-sm appearance-none"
                            >
                                <option value="student">{t('settings.student')}</option>
                                <option value="professional">{t('settings.professional')}</option>
                                <option value="freelancer">{t('settings.freelancer')}</option>
                                <option value="creator">{t('settings.creator')}</option>
                                <option value="entrepreneur">{t('settings.entrepreneur')}</option>
                            </select>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                                className="flex-1 border border-navy dark:border-slate-700 text-navy dark:text-slate-200 text-[13px] font-semibold py-2 rounded-xl hover:bg-navy/5 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                {t('settings.cancel')}
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex-1 bg-accent text-white text-[13px] font-semibold py-2 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? t('settings.saving') : t('settings.saveChanges')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-navy dark:text-slate-100 text-[18px] font-bold mt-4">{user?.full_name || 'No Name'}</h2>
                        <p className="text-blue-muted dark:text-slate-400 text-[13px]">{user?.email}</p>
                        {user?.profile_type && (
                            <p className="text-accent text-[12px] font-semibold mt-1 capitalize">
                                {t(`settings.${user.profile_type}`, user.profile_type.replace('_', ' '))}
                            </p>
                        )}
                        {saveSuccessMessage && (
                            <p className="text-[#27ae60] text-[12px] font-semibold mt-2">{saveSuccessMessage}</p>
                        )}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="mt-4 border border-navy dark:border-slate-700 text-navy dark:text-slate-200 text-[13px] font-semibold px-6 py-1.5 rounded-xl hover:bg-navy/5 dark:hover:bg-slate-800 transition-colors"
                        >
                            {t('settings.editProfile')}
                        </button>
                    </>
                )}

                {/* My Plan Card */}
                <div className="w-full bg-navy rounded-2xl p-6 mt-8 relative overflow-hidden shadow-md">
                    <div className="relative z-10">
                        <p className="text-white/80 text-sm font-medium">{t('settings.plan')}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <h3 className="text-white text-xl font-bold uppercase">
                                {user?.plan === 'free' ? t('settings.free') : user?.plan === 'lifetime' ? t('settings.lifetime', 'Lifetime') : t('settings.pro', 'Pro')}
                            </h3>
                            {user?.plan !== 'free' && user?.plan !== 'lifetime' && (
                                <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                    {user?.plan === 'pro_yearly' ? t('settings.annual', 'Annual') : t('settings.monthly', 'Monthly')}
                                </span>
                            )}
                        </div>
                        <p className="text-white/70 text-[12px] mt-2">
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
                            className="w-full bg-white text-navy text-[15px] font-semibold h-11 rounded-xl mt-5 hover:bg-white/90 transition-colors cursor-pointer"
                        >
                            {!user?.plan || user.plan === 'free' ? t('settings.upgrade', 'Upgrade to Pro') : t('settings.manage', 'Manage plan')}
                        </button>
                    </div>
                    {/* Background Decorative Icon */}
                    <div className="absolute top-2 -right-4 opacity-10">
                        <DiamondIcon size={120} color="#FFFFFF" />
                    </div>
                </div>

                {/* Preferences */}
                <div className="w-full mt-8">
                    <h3 className="text-navy dark:text-slate-100 text-[16px] font-semibold mb-3">{t('settings.preferences')}</h3>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-card-bg/30 dark:border-slate-800 transition-colors duration-300">
                        {isNative && (
                            <>
                                <PreferenceRow
                                    icon={<BellIcon size={20} color="currentColor" />}
                                    iconBg="bg-navy/10 dark:bg-slate-800 text-navy dark:text-slate-400"
                                    label={t('settings.taskRemindersSoon', 'Task Reminders (Soon)')}
                                    value={false}
                                    onChange={() => { }}
                                />
                                <PreferenceRow
                                    icon={<CycleIcon size={20} color="currentColor" />}
                                    iconBg="bg-accent/10 dark:bg-slate-800 text-accent dark:text-accent"
                                    label={t('settings.habitRemindersSoon', 'Habit Reminders (Soon)')}
                                    value={false}
                                    onChange={() => { }}
                                />
                            </>
                        )}
                        <PreferenceRow
                            icon={<TimerIcon size={20} color="currentColor" />}
                            iconBg="bg-error/10 dark:bg-slate-800 text-error"
                            label={t('settings.pomodoroAlertsSoon', 'Pomodoro Alerts (Soon)')}
                            value={false}
                            onChange={() => { }}
                        />
                        <div className="flex items-center justify-between p-4 border-t border-card-bg/30 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-navy/10 dark:bg-slate-800 flex items-center justify-center text-navy dark:text-slate-400">
                                    <GlobeIcon size={20} color="currentColor" />
                                </div>
                                <span className="text-navy-darker dark:text-slate-100 text-[14px] font-medium">{t('settings.language')}</span>
                            </div>
                            <div className="flex items-center gap-1 text-blue-muted dark:text-slate-400">
                                <div className="relative">
                                    <select
                                        value={i18n.language || 'en'}
                                        onChange={(e) => {
                                            const lang = e.target.value;
                                            i18n.changeLanguage(lang);
                                            localStorage.setItem('language', lang);
                                        }}
                                        className="bg-transparent text-[13px] text-blue-muted dark:text-slate-400 outline-none pr-6 pl-2 py-1 appearance-none cursor-pointer text-right font-medium"
                                    >
                                        <option value="en" className="bg-white dark:bg-slate-900 text-navy dark:text-slate-200">English</option>
                                        <option value="es" className="bg-white dark:bg-slate-900 text-navy dark:text-slate-200">Español</option>
                                        <option value="fr" className="bg-white dark:bg-slate-900 text-navy dark:text-slate-200">Français</option>
                                        <option value="de" className="bg-white dark:bg-slate-900 text-navy dark:text-slate-200">Deutsch</option>
                                        <option value="ja" className="bg-white dark:bg-slate-900 text-navy dark:text-slate-200">日本語</option>
                                        <option value="ko" className="bg-white dark:bg-slate-900 text-navy dark:text-slate-200">한국어</option>
                                        <option value="zh-CN" className="bg-white dark:bg-slate-900 text-navy dark:text-slate-200">简体中文</option>
                                        <option value="hi" className="bg-white dark:bg-slate-900 text-navy dark:text-slate-200">हिन्दी</option>
                                    </select>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-blue-muted dark:text-slate-400">
                                        <ChevronRightIcon size={18} color="currentColor" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DarkModeToggle />
                    </div>
                </div>

                {/* AI connections */}
                <div className="w-full mt-8">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-card-bg/30 dark:border-slate-800 transition-colors duration-300">
                        <Link href="/settings?tab=connections" className="flex items-center justify-between p-4 hover:bg-page-bg/50 dark:hover:bg-slate-800/50 transition-colors duration-300 cursor-pointer">
                            <span className="flex items-center gap-3">
                                <Plug className="h-[18px] w-[18px] text-navy dark:text-slate-300" aria-hidden />
                                <span className="text-navy dark:text-slate-100 opacity-90 text-[14px] font-medium">AI connections</span>
                            </span>
                            <ChevronRightIcon size={18} color="currentColor" className="text-blue-muted dark:text-slate-400" />
                        </Link>
                    </div>
                </div>

                {/* Support */}
                <div className="w-full mt-8">
                    <h3 className="text-navy dark:text-slate-100 text-[16px] font-semibold mb-3">{t('settings.support')}</h3>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-card-bg/30 dark:border-slate-800 transition-colors duration-300">
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

                {/* Destructive Actions */}
                <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full bg-navy text-white text-[15px] font-semibold h-12 rounded-xl mt-10 hover:bg-navy-dark transition-colors"
                >
                    {t('settings.deleteAccount')}
                </button>

                {/* Version & Credits */}
                <div className="mt-8 text-center">
                    <p className="text-blue-muted text-[11px]">{t('settings.version')}</p>
                    <p className="text-blue-muted text-[11px] mt-1">{t('settings.builtBy')}</p>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full bg-accent text-white text-[15px] font-semibold h-12 rounded-xl mt-6 mb-10 hover:bg-accent-dark transition-colors shadow-lg shadow-accent/20"
                >
                    {t('settings.logout')}
                </button>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                    <div className="bg-white dark:bg-slate-900 w-full max-w-[340px] rounded-2xl p-6 relative z-10 shadow-2xl border dark:border-slate-800">
                        <h3 className="text-navy dark:text-slate-100 text-lg font-bold">{t('settings.deleteAccountConfirmTitle')}</h3>
                        <p className="text-blue-muted dark:text-slate-400 text-sm mt-2">
                            {t('settings.deleteAccountConfirmDesc')}
                        </p>
                        <p className="text-navy-darker dark:text-slate-200 text-[13px] font-medium mt-4">
                            {t('settings.deleteAccountConfirmType')}
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={t('settings.typeDelete')}
                            className="w-full h-11 bg-card-bg dark:bg-slate-800 border border-card-border dark:border-slate-700 rounded-xl px-4 mt-2 text-sm outline-none focus:border-error text-navy dark:text-slate-100"
                        />
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 h-11 bg-card-bg dark:bg-slate-800 text-navy dark:text-slate-200 text-[14px] font-semibold rounded-xl"
                            >
                                {t('settings.cancel')}
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE'}
                                className="flex-1 h-11 bg-error text-white text-[14px] font-semibold rounded-xl disabled:opacity-40"
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
        <div className="flex items-center justify-between p-4 border-b border-card-bg/30 dark:border-slate-800 last:border-0 transition-colors duration-300">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                    {icon}
                </div>
                <span className="text-navy-darker dark:text-slate-100 text-[14px] font-medium">{label}</span>
            </div>
            {/* Custom Toggle */}
            <button
                onClick={() => onChange(!value)}
                className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-accent' : 'bg-card-bg dark:bg-slate-700'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${value ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    )
}

function SupportLink({ label, href, to, onClick, isExpanded, expandContent }: { label: string, href?: string, to?: string, onClick?: () => void, isExpanded?: boolean, expandContent?: string }) {
    if (to) {
        return (
            <Link href={to} className="flex items-center justify-between p-4 border-b border-card-bg/30 dark:border-slate-800 last:border-0 hover:bg-page-bg/50 dark:hover:bg-slate-800/50 transition-colors duration-300 cursor-pointer">
                <span className="text-navy dark:text-slate-100 opacity-90 text-[14px] font-medium">{label}</span>
                <ChevronRightIcon size={18} color="currentColor" className="text-blue-muted dark:text-slate-400" />
            </Link>
        )
    }

    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 border-b border-card-bg/30 dark:border-slate-800 last:border-0 hover:bg-page-bg/50 dark:hover:bg-slate-800/50 transition-colors duration-300">
                <span className="text-navy dark:text-slate-100 opacity-90 text-[14px] font-medium">{label}</span>
                <ChevronRightIcon size={18} color="currentColor" className="text-blue-muted dark:text-slate-400" />
            </a>
        )
    }

    if (onClick) {
        return (
            <div className="border-b border-card-bg/30 dark:border-slate-800 last:border-0 transition-colors duration-300">
                <div onClick={onClick} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 hover:bg-page-bg/50 dark:hover:bg-slate-800/50 transition-colors duration-300 cursor-pointer">
                    <span className="text-navy dark:text-slate-100 opacity-90 text-[14px] font-medium">{label}</span>
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRightIcon size={18} color="currentColor" className="text-blue-muted dark:text-slate-400" />
                    </div>
                </div>
                {isExpanded && (
                    <div className="p-4 bg-page-bg/30 dark:bg-slate-950/30 border-t border-card-bg/10 dark:border-slate-800/50 text-[13px] text-navy dark:text-slate-200 transition-colors duration-300">
                        {expandContent ? (
                            <ReactMarkdown
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-navy dark:text-slate-100 mt-4 mb-2" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-base font-semibold text-navy dark:text-slate-100 mt-4 mb-2" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-[15px] font-medium text-navy dark:text-slate-200 mt-3 mb-1" {...props} />,
                                    p: ({ node, ...props }) => <p className="text-[13px] text-blue-muted dark:text-slate-400 mb-3 leading-relaxed" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 text-[13px] text-blue-muted dark:text-slate-400" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 text-[13px] text-blue-muted dark:text-slate-400" {...props} />,
                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-navy dark:text-slate-100" {...props} />,
                                    hr: ({ node, ...props }) => <hr className="border-card-bg/50 dark:border-slate-800 my-4" {...props} />,
                                }}
                            >
                                {expandContent}
                            </ReactMarkdown>
                        ) : (
                            <div className="flex items-center justify-center p-4">
                                <div className="animate-pulse bg-card-bg dark:bg-slate-800 w-8 h-8 rounded-full" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between p-4 border-b border-card-bg/30 dark:border-slate-800 last:border-0 hover:bg-page-bg/50 dark:hover:bg-slate-800/50 transition-colors duration-300 cursor-pointer">
            <span className="text-navy dark:text-slate-100 opacity-90 text-[14px] font-medium">{label}</span>
            <ChevronRightIcon size={18} color="currentColor" className="text-blue-muted dark:text-slate-400" />
        </div>
    )
}

function LoadingSpinner() {
    return (
        <div className="min-h-screen bg-page-bg dark:bg-slate-950 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center space-y-5">
                <div className="w-12 h-12 rounded-full border-4 border-[#EAE3D9] dark:border-slate-800 border-t-[#3D2E20] dark:border-t-accent animate-spin" />
                <span className="text-[#3D2E20] dark:text-slate-300 font-bold tracking-[0.25em] text-sm animate-pulse">FOCALYST</span>
            </div>
        </div>
    )
}

