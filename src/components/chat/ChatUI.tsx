'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useChat as useGlobalChat } from '@/context/ChatContext'
import { usePlan } from '@/context/PlanContext'
import { CloseIcon, SendArrowIcon } from '@/components/icons'
import { Mic } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase'
import { FREE_TIER_LIMITS, dateKeyFromSupabase, localDateKey } from '@/lib/featureGates'
import { useAuth } from '@/context/AuthContext'

export function ChatUI() {
    const { isChatOpen, closeChat } = useGlobalChat()
    const router = useRouter()
    const { refreshData } = usePlan()
    const { refreshUserProfile } = useAuth()
    const [isFreeUser, setIsFreeUser] = useState(false)
    const [messagesUsed, setMessagesUsed] = useState(0)
    const [loadingInfo, setLoadingInfo] = useState(true)
    const [showCopyToast, setShowCopyToast] = useState(false)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Robust manual chat state with stream support and UI error boundaries
    const [messages, setMessages] = useState<any[]>([])
    const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready')
    const [chatError, setChatError] = useState<Error | null>(null)
    const isLoading = status === 'loading'
    
    // Manual React state to handle the input field separately
    const [inputValue, setInputValue] = useState('')
    const [limitBannerVisible, setLimitBannerVisible] = useState(false)

    // Helper to extract text content from the message structure
    const getMessageContent = (msg: any) => {
        if (msg.content) return msg.content
        if (!msg.parts) return ''
        return msg.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('')
    }

    // Manual append and stream implementation to securely handle auth and stream reading
    const append = async (msg: { role: string; content: string }) => {
        setStatus('loading')
        setChatError(null)

        const userMessageId = Date.now().toString()
        const userMessage = {
            id: userMessageId,
            role: 'user',
            content: msg.content,
            parts: [{ type: 'text', text: msg.content }]
        }

        // Add user message to state
        setMessages(prev => [...prev, userMessage])

        // Prepare context messages history to send to backend API
        const newMessagesHistory = [
            ...messages.map(m => ({
                role: m.role,
                content: getMessageContent(m)
            })),
            { role: 'user', content: msg.content }
        ]

        try {
            // Forcefully retrieve a fresh session immediately before the fetch call
            let { data: { session } } = await supabase.auth.getSession()

            // Attempt to refresh the session if access token is not immediately available
            if (!session?.access_token) {
                const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
                if (refreshedSession) {
                    session = refreshedSession
                }
            }

            // Guard: sending an empty Bearer header causes the Edge-runtime server to
            // return a 401 HTML page instead of a JSON/stream response, which produces
            // the '[FRONTEND CRASH]: Received HTML response' error. Fail here instead
            // with a clear, actionable message.
            if (!session?.access_token) {
                throw new Error('Your session has expired. Please sign out and sign back in to use Focalyst AI.')
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            }

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({ messages: newMessagesHistory })
            })

            if (!res.ok) {
                const contentType = res.headers.get('content-type') || ''
                if (contentType.includes('text/html')) {
                    throw new Error(`Authentication session expired or invalid request. Status: ${res.status}`)
                }
                const errData = await res.json().catch(() => ({ error: 'Unknown server error' }))
                throw new Error(errData.error || `Server responded with status ${res.status}`)
            }

            const contentType = res.headers.get('content-type') || ''
            if (contentType.includes('text/html')) {
                throw new Error('Received HTML response instead of AI stream. Please check your authentication session.')
            }

            if (!res.body) {
                throw new Error('Response body is empty')
            }

            const assistantMessageId = (Date.now() + 1).toString()
            const assistantMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                parts: [{ type: 'text', text: '' }]
            }

            // Append the empty assistant stream container
            setMessages(prev => [...prev, assistantMessage])

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let assistantReply = ''

            // Stream reading loop wrapped in safe execution check
            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                assistantReply += chunk

                // Dynamically update stream content in the UI
                setMessages(prev => prev.map(m => 
                    m.id === assistantMessageId 
                        ? { ...m, content: assistantReply, parts: [{ type: 'text', text: assistantReply }] }
                        : m
                ))
            }

            setStatus('ready')
            if (isFreeUser) {
                const nextCount = Math.min(messagesUsed + 1, FREE_TIER_LIMITS.aiMessagesPerDay)
                await supabase
                    .from('users')
                    .update({
                        ai_message_count: nextCount,
                        last_message_date: new Date().toISOString(),
                    })
                    .eq('id', session.user.id)
                setMessagesUsed(nextCount)
                refreshUserProfile()
            }
            refreshData()
            return true
        } catch (error: any) {
            console.error('[FRONTEND CRASH]:', error)
            setChatError(error)
            setStatus('error')

            if (String(error?.message || '').toLowerCase().includes('daily limit')) {
                setLimitBannerVisible(true)
            }
            
            // Append a visible error message directly to the chat's state array so the user sees it in the UI
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `[FRONTEND CRASH]: ${error.message || 'An unexpected error occurred'}`,
                    parts: [{ type: 'text', text: `[FRONTEND CRASH]: ${error.message || 'An unexpected error occurred'}` }]
                }
            ])
            return false
        }
    }

    // Scroll to bottom when messages update or typing
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages, isLoading])

    // Body scroll lock when chat is open
    useEffect(() => {
        if (isChatOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }
        return () => { document.body.style.overflow = 'auto' }
    }, [isChatOpen])

    // Fetch user plan limits and reset the daily AI counter when a new local day starts.
    useEffect(() => {
        if (!isChatOpen) return;

        async function fetchPlanAndUsage() {
            setLoadingInfo(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('plan, ai_message_count, last_message_date')
                .eq('id', user.id)
                .single()

            const isFree = profile?.plan === 'free'
            setIsFreeUser(isFree)

            if (isFree) {
                const todayKey = localDateKey()
                const lastKey = dateKeyFromSupabase(profile?.last_message_date)

                if (lastKey !== todayKey) {
                    const { error } = await supabase
                        .from('users')
                        .update({
                            ai_message_count: 0,
                            last_message_date: new Date().toISOString(),
                        })
                        .eq('id', user.id)

                    if (error) {
                        console.error('Failed to reset AI message usage:', error)
                    }

                    setMessagesUsed(0)
                    refreshUserProfile()
                } else {
                    setMessagesUsed(profile?.ai_message_count || 0)
                }
            } else {
                setMessagesUsed(0)
            }
            setLoadingInfo(false)
        }

        fetchPlanAndUsage()
    }, [isChatOpen, supabase])

    if (!isChatOpen) return null

    const handleSendAction = async (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        if (isLimitReached) {
            setLimitBannerVisible(true)
            return
        }
        
        const messageText = inputValue;
        setInputValue('');
        await append({ role: 'user', content: messageText });
    }

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 2000);
    }

    const suggestions = [
        "What should I focus on today?",
        "Add a task for tomorrow",
        "How productive was I this week?",
        "Remind me to review notes at 8pm"
    ]

    const handleSuggestion = async (text: string) => {
        if (isLimitReached) {
            setLimitBannerVisible(true)
            return
        }
        await append({ role: 'user', content: text });
    }

    const isLimitReached = isFreeUser && messagesUsed >= FREE_TIER_LIMITS.aiMessagesPerDay
    const isReadyToSubmit = inputValue.trim().length > 0 && !isLoading

    return (
        <div className="fixed inset-0 z-50 flex justify-end transition-opacity duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20" onClick={closeChat}></div>

            {/* Chat Panel */}
            <div className="relative w-full h-[85vh] mt-auto md:mt-0 md:h-full md:w-[380px] bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-l-3xl md:rounded-r-none shadow-2xl flex flex-col pt-2 animate-slide-up md:animate-slide-left transition-colors">

                {/* Mobile drag handle */}
                <div className="w-12 h-1.5 bg-card-bg dark:bg-slate-700 rounded-full mx-auto mb-4 md:hidden"></div>

                {/* Copy Toast Notification */}
                {showCopyToast && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] bg-navy/90 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg animate-fade-in flex items-center gap-2 border border-white/20 backdrop-blur-sm">
                        <span>📋 Copied!</span>
                    </div>
                )}

                {/* Header */}
                <div className="px-6 pb-4 flex justify-between items-start border-b border-page-bg dark:border-slate-800">
                    <div>
                        <h2 className="text-[20px] font-semibold text-navy dark:text-slate-100 tracking-tight">Ask Focalyst AI</h2>
                        <p className="text-[11px] text-blue-muted dark:text-slate-400">Powered by OpenRouter</p>
                    </div>
                    <button onClick={closeChat} className="p-1 -mr-1" aria-label="Close Chat">
                        <CloseIcon size={24} color="#95A7B5" />
                    </button>
                </div>

                {/* Chat Area */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 pb-24 flex flex-col gap-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center mt-[-40px]">
                            {/* Empty State */}
                            <div className="flex flex-col gap-3 w-full max-w-[280px] mx-auto mb-8">
                                {suggestions.map((text, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSuggestion(text)}
                                        className="bg-card-bg/20 dark:bg-slate-800 border border-card-bg dark:border-slate-700 text-navy dark:text-slate-200 text-[13px] font-medium py-3 px-4 rounded-xl text-left hover:bg-card-bg/40 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        {text}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[12px] text-blue-muted max-w-[260px] mx-auto leading-relaxed">
                                I can add tasks, set reminders, summarise your week, and answer productivity questions.
                            </p>
                        </div>
                    ) : (
                        messages.filter(m => m.role !== 'system').map((msg) => {
                            const content = getMessageContent(msg);
                            return (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group relative`}>
                                    <div className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'bg-navy text-white rounded-tr-sm'
                                            : 'bg-card-bg/30 dark:bg-slate-800 text-navy dark:text-slate-200 rounded-tl-sm prose prose-sm prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:my-0'
                                    }`}>
                                        {msg.role === 'assistant' ? (
                                            <>
                                                <ReactMarkdown>{content || (isLoading && msg.id === messages[messages.length-1]?.id ? '...' : '')}</ReactMarkdown>
                                                
                                                {/* Copy Button */}
                                                {content && content !== '...' && content !== '' && (
                                                    <button 
                                                        onClick={() => handleCopy(content)}
                                                        className="absolute -bottom-3 -right-2 bg-white dark:bg-slate-700 border border-page-bg dark:border-slate-600 text-blue-muted hover:text-navy dark:hover:text-slate-200 rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Copy message"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            content
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Typing Indicator */}
                    {isLoading && messages[messages.length-1]?.role === 'user' && (
                        <div className="flex justify-start">
                            <div className="bg-card-bg/30 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex gap-1.5 pt-1">
                                    <div className="w-1.5 h-1.5 bg-blue-muted rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-muted rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-muted rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 px-6 py-4 pb-safe border-t border-page-bg dark:border-slate-800 transition-colors">
                    {(limitBannerVisible || isLimitReached) && isFreeUser && (
                        <button
                            type="button"
                            onClick={() => {
                                closeChat()
                                router.push('/paywall')
                            }}
                            className="mb-2 w-full rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-navy dark:text-slate-100 hover:bg-accent/15 transition-colors"
                        >
                            Daily AI limit reached. ⚡️ Upgrade to Pro
                        </button>
                    )}

                    {chatError && (
                        <div className="mb-2 px-2 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg animate-fade-in">
                            <p className="text-[11px] text-red-600 font-medium">
                                ⚠️ {chatError.message || 'Focalyst AI is currently unavailable. Please try again.'}
                            </p>
                        </div>
                    )}
                    
                    {isLimitReached ? (
                        <div className="flex flex-col items-center gap-2 pb-2">
                            <p className="text-[13px] text-navy font-medium text-center">You've used all 5 free messages today.</p>
                            <p className="text-[12px] text-blue-muted text-center max-w-[260px] mb-2">Upgrade to Pro for unlimited AI chat 🚀</p>
                            <button onClick={() => { closeChat(); router.push('/paywall'); }} className="bg-accent text-white font-semibold text-[14px] py-2.5 px-6 rounded-full shadow-md">
                                Upgrade Now
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSendAction} className="w-full">
                            <div className="bg-page-bg dark:bg-slate-950 border border-transparent dark:border-slate-800 rounded-full flex items-center px-4 py-2 mb-2">
                                <button type="button" className="p-1 -ml-1 flex-shrink-0 text-blue-muted hover:text-navy dark:hover:text-slate-200" aria-label="Voice input">
                                    <Mic size={20} color="currentColor" />
                                </button>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="flex-1 bg-transparent border-none outline-none px-3 text-[14px] text-navy dark:text-slate-100 placeholder:text-blue-muted dark:placeholder:text-slate-500 min-w-0"
                                />
                                <button
                                    type="submit"
                                    disabled={!isReadyToSubmit}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                        isReadyToSubmit 
                                            ? 'bg-navy dark:bg-blue-500 text-white opacity-100' 
                                            : 'bg-navy dark:bg-blue-500/40 text-white opacity-40'
                                    }`}
                                >
                                    <SendArrowIcon size={16} />
                                </button>
                            </div>
                            {!loadingInfo && isFreeUser && (
                                <p className="text-center text-[11px] text-blue-muted">
                                    {messagesUsed} of {FREE_TIER_LIMITS.aiMessagesPerDay} daily messages used
                                </p>
                            )}
                        </form>
                    )}
                </div>

            </div>
        </div>
    )
}
