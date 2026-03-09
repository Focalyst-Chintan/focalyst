'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'
import { getMarkdownContent } from './actions'

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
import { User } from '@/types'

export default function AccountPage() {
    const router = useRouter()
    const supabase = createClient()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    const [isEditing, setIsEditing] = useState(false)
    const [editFullName, setEditFullName] = useState('')
    const [editProfileType, setEditProfileType] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccessMessage, setSaveSuccessMessage] = useState('')

    const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null)
    const [accordionContent, setAccordionContent] = useState<Record<string, string>>({})

    useEffect(() => {
        async function fetchUser() {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/')
                return
            }

            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single()

            setUser(profile)
            setEditFullName(profile.full_name || '')
            setEditProfileType(profile.profile_type || 'professional')
            setLoading(false)
        }
        fetchUser()
    }, [supabase, router])

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
            setSaveSuccessMessage('Profile saved successfully!')
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
            const content = await getMarkdownContent(filename)
            setAccordionContent(prev => ({ ...prev, [id]: content }))
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

        // Logic for deletion would go here (server action or edge function)
        console.log('Deleting account...')
        await supabase.auth.signOut()
        router.push('/')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse bg-card-bg w-12 h-12 rounded-full" />
            </div>
        )
    }

    if (!user) return null

    return (
        <main className="min-h-screen bg-page-bg pb-20">
            {/* Header */}
            <header className="h-14 bg-white flex items-center justify-between px-5 sticky top-0 z-30">
                <button onClick={() => router.back()} className="p-1 -ml-1">
                    <ArrowLeftIcon size={24} color="#4A6C8C" />
                </button>
                <h1 className="text-navy text-[16px] font-bold tracking-[0.15em] absolute left-1/2 -translate-x-1/2">
                    PROFILE
                </h1>
                <div className="w-8" /> {/* Placeholder for balance */}
            </header>

            <div className="px-5 pt-8 flex flex-col items-center">
                {/* Profile Photo */}
                <div className="relative">
                    <div className="w-[64px] h-[64px] rounded-full bg-card-bg overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                        {user.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.full_name || 'User'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <UserAccountIcon size={32} color="#95A7B5" />
                        )}
                    </div>
                    <div className={`absolute -bottom-1 -right-2 ${user.plan === 'free' ? 'bg-card-bg text-navy' : 'bg-accent text-white'} text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white`}>
                        {user.plan === 'free' ? 'FREE' : 'PRO'}
                    </div>

                </div>

                {isEditing ? (
                    <div className="w-full max-w-sm mt-4 flex flex-col gap-3">
                        <div>
                            <label className="text-navy text-[12px] opacity-80 font-semibold ml-1">Full Name</label>
                            <input
                                type="text"
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="w-full h-11 bg-white border border-card-bg/30 rounded-xl px-4 text-[14px] text-navy outline-none focus:border-accent shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="text-navy text-[12px] opacity-80 font-semibold ml-1">Profile Type</label>
                            <select
                                value={editProfileType}
                                onChange={(e) => setEditProfileType(e.target.value)}
                                className="w-full h-11 bg-white border border-card-bg/30 rounded-xl px-4 text-[14px] text-navy outline-none focus:border-accent shadow-sm appearance-none"
                            >
                                <option value="student">Student</option>
                                <option value="professional">Working Professional</option>
                                <option value="freelancer">Freelancer</option>
                                <option value="creator">Creator</option>
                                <option value="entrepreneur">Entrepreneur</option>
                            </select>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={isSaving}
                                className="flex-1 border border-navy text-navy text-[13px] font-semibold py-2 rounded-xl hover:bg-navy/5 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex-1 bg-accent text-white text-[13px] font-semibold py-2 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-navy text-[18px] font-bold mt-4">{user.full_name || 'No Name'}</h2>
                        <p className="text-blue-muted text-[13px]">{user.email}</p>
                        {user.profile_type && (
                            <p className="text-accent text-[12px] font-semibold mt-1 capitalize">{user.profile_type.replace('_', ' ')}</p>
                        )}
                        {saveSuccessMessage && (
                            <p className="text-[#27ae60] text-[12px] font-semibold mt-2">{saveSuccessMessage}</p>
                        )}
                        <button
                            onClick={() => setIsEditing(true)}
                            className="mt-4 border border-navy text-navy text-[13px] font-semibold px-6 py-1.5 rounded-xl hover:bg-navy/5 transition-colors"
                        >
                            Edit Profile
                        </button>
                    </>
                )}

                {/* My Plan Card */}
                <div className="w-full bg-navy rounded-2xl p-6 mt-8 relative overflow-hidden shadow-md">
                    <div className="relative z-10">
                        <p className="text-white/80 text-sm font-medium">My Plan</p>
                        <div className="flex items-center gap-2 mt-1">
                            <h3 className="text-white text-xl font-bold uppercase">
                                {user.plan === 'free' ? 'Free' : user.plan === 'lifetime' ? 'Lifetime' : 'Pro'}
                            </h3>
                            {user.plan !== 'free' && user.plan !== 'lifetime' && (
                                <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                    {user.plan === 'pro_yearly' ? 'Annual' : 'Monthly'}
                                </span>
                            )}
                        </div>
                        <p className="text-white/70 text-[12px] mt-2">
                            {user.plan === 'lifetime' ? 'Focus forever' : `Renewal Date: Dec 12, 2026`}
                        </p>

                        <button
                            onClick={() => router.push('/onboarding/plans?redirect=/account')}
                            className="w-full bg-white text-navy text-[15px] font-semibold h-11 rounded-xl mt-5 hover:bg-white/90 transition-colors"
                        >
                            Manage Plan
                        </button>
                    </div>
                    {/* Background Decorative Icon */}
                    <div className="absolute top-2 -right-4 opacity-10">
                        <DiamondIcon size={120} color="#FFFFFF" />
                    </div>
                </div>

                {/* Preferences */}
                <div className="w-full mt-8">
                    <h3 className="text-navy text-[16px] font-semibold mb-3">Preferences</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-card-bg/30">
                        <PreferenceRow
                            icon={<BellIcon size={20} color="#4A6C8C" />}
                            iconBg="bg-navy/10"
                            label="Task Reminders (Soon)"
                            value={false}
                            onChange={() => { }}
                        />
                        <PreferenceRow
                            icon={<CycleIcon size={20} color="#FF751F" />}
                            iconBg="bg-accent/10"
                            label="Habit Reminders (Soon)"
                            value={false}
                            onChange={() => { }}
                        />
                        <PreferenceRow
                            icon={<TimerIcon size={20} color="#C0392B" />}
                            iconBg="bg-error/10"
                            label="Pomodoro Alerts (Soon)"
                            value={false}
                            onChange={() => { }}
                        />
                        <div className="flex items-center justify-between p-4 border-t border-card-bg/30">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-navy/10 flex items-center justify-center">
                                    <GlobeIcon size={20} color="#4A6C8C" />
                                </div>
                                <span className="text-navy-darker text-[14px] font-medium">Language</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-blue-muted text-[13px]">English</span>
                                <ChevronRightIcon size={18} color="#95A7B5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dark Mode */}
                <div className="w-full mt-4">
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-card-bg/30">
                        <PreferenceRow
                            icon={<MoonIcon size={20} color="#9061F9" />}
                            iconBg="bg-purple-500/10"
                            label="Dark Mode (Soon)"
                            value={false}
                            onChange={() => { }}
                        />
                    </div>
                </div>

                {/* Support */}
                <div className="w-full mt-8">
                    <h3 className="text-navy text-[16px] font-semibold mb-3">Support</h3>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-card-bg/30">
                        <SupportLink
                            label="Help & FAQ"
                            onClick={() => toggleAccordion('faq', 'focalyst-help-faq.md')}
                            isExpanded={expandedAccordion === 'faq'}
                            expandContent={accordionContent['faq']}
                        />
                        <SupportLink
                            label="Contact Us"
                            href="https://www.chintan.shop/emaillist"
                        />
                        <SupportLink
                            label="Privacy Policy"
                            onClick={() => toggleAccordion('privacy', 'focalyst-privacy-policy.md')}
                            isExpanded={expandedAccordion === 'privacy'}
                            expandContent={accordionContent['privacy']}
                        />
                        <SupportLink
                            label="Terms of Service"
                            onClick={() => toggleAccordion('terms', 'focalyst-terms-of-service.md')}
                            isExpanded={expandedAccordion === 'terms'}
                            expandContent={accordionContent['terms']}
                        />
                    </div>
                </div>

                {/* Destructive Actions */}
                <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full bg-navy text-white text-[15px] font-semibold h-12 rounded-xl mt-10 hover:bg-navy-dark transition-colors"
                >
                    Delete my account
                </button>

                {/* Version & Credits */}
                <div className="mt-8 text-center">
                    <p className="text-blue-muted text-[11px]">Version: Focalyst V1</p>
                    <p className="text-blue-muted text-[11px] mt-1">Built by Chintan</p>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full bg-accent text-white text-[15px] font-semibold h-12 rounded-xl mt-6 mb-10 hover:bg-accent-dark transition-colors shadow-lg shadow-accent/20"
                >
                    Log out
                </button>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
                    <div className="bg-white w-full max-w-[340px] rounded-2xl p-6 relative z-10 shadow-2xl">
                        <h3 className="text-navy text-lg font-bold">Delete Account</h3>
                        <p className="text-blue-muted text-sm mt-2">
                            This action is permanent and cannot be undone. All your data will be wiped.
                        </p>
                        <p className="text-navy-darker text-[13px] font-medium mt-4">
                            Please type <span className="text-error font-bold">DELETE</span> to confirm:
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="w-full h-11 bg-card-bg border border-card-border rounded-xl px-4 mt-2 text-sm outline-none focus:border-error"
                        />
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 h-11 bg-card-bg text-navy text-[14px] font-semibold rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE'}
                                className="flex-1 h-11 bg-error text-white text-[14px] font-semibold rounded-xl disabled:opacity-40"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
        <div className="flex items-center justify-between p-4 border-b border-card-bg/30 last:border-0">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                    {icon}
                </div>
                <span className="text-navy-darker text-[14px] font-medium">{label}</span>
            </div>
            {/* Custom Toggle */}
            <button
                onClick={() => onChange(!value)}
                className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-accent' : 'bg-card-bg'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${value ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    )
}

function SupportLink({ label, href, onClick, isExpanded, expandContent }: { label: string, href?: string, onClick?: () => void, isExpanded?: boolean, expandContent?: string }) {
    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 border-b border-card-bg/30 last:border-0 hover:bg-page-bg/50 transition-colors">
                <span className="text-navy opacity-90 text-[14px] font-medium">{label}</span>
                <ChevronRightIcon size={18} color="#95A7B5" />
            </a>
        )
    }

    if (onClick) {
        return (
            <div className="border-b border-card-bg/30 last:border-0">
                <div onClick={onClick} className="flex items-center justify-between p-4 bg-white hover:bg-page-bg/50 transition-colors cursor-pointer">
                    <span className="text-navy opacity-90 text-[14px] font-medium">{label}</span>
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRightIcon size={18} color="#95A7B5" />
                    </div>
                </div>
                {isExpanded && (
                    <div className="p-4 bg-page-bg/30 border-t border-card-bg/10 text-[13px] text-navy">
                        {expandContent ? (
                            <ReactMarkdown
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-navy mt-4 mb-2" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-base font-semibold text-navy mt-4 mb-2" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-[15px] font-medium text-navy mt-3 mb-1" {...props} />,
                                    p: ({ node, ...props }) => <p className="text-[13px] text-blue-muted mb-3 leading-relaxed" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 text-[13px] text-blue-muted" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 text-[13px] text-blue-muted" {...props} />,
                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-navy" {...props} />,
                                    hr: ({ node, ...props }) => <hr className="border-card-bg/50 my-4" {...props} />,
                                }}
                            >
                                {expandContent}
                            </ReactMarkdown>
                        ) : (
                            <div className="flex items-center justify-center p-4">
                                <div className="animate-pulse bg-card-bg w-8 h-8 rounded-full" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between p-4 border-b border-card-bg/30 last:border-0 hover:bg-page-bg/50 transition-colors cursor-pointer">
            <span className="text-navy opacity-90 text-[14px] font-medium">{label}</span>
            <ChevronRightIcon size={18} color="#95A7B5" />
        </div>
    )
}
