'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useChat as useGlobalChat } from '@/context/ChatContext'
import { usePlan } from '@/context/PlanContext'
import { CloseIcon, MicrophoneIcon, SendArrowIcon } from '@/components/icons'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase'
import { useChat } from '@ai-sdk/react'

export function ChatUI() {
    const { isChatOpen, closeChat } = useGlobalChat()
    const { refreshData } = usePlan()
    const [isFreeUser, setIsFreeUser] = useState(false)
    const [messagesUsed, setMessagesUsed] = useState(0)
    const [loadingInfo, setLoadingInfo] = useState(true)
    const [showCopyToast, setShowCopyToast] = useState(false)
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // STRICT HARD-REPLACEMENT: Only pulling out properties TypeScript allows
    // and deriving requested helpers locally for clean types.
    const { messages, status, sendMessage: _sendMessage, error: chatError } = useChat({
        onFinish: () => {
            refreshData()
        },
        onError: (err) => {
            console.error('Chat API Error:', err.message);
            if (isFreeUser) {
                setMessagesUsed(prev => Math.max(0, prev - 1))
            }
        }
    });

    const isLoading = status !== 'ready' && status !== 'error'
    
    // Manual React state to handle the input field separately from hook
    const [inputValue, setInputValue] = React.useState('');

    // Manual append implementation to provide requested syntax
    const append = (msg: { role: string; content: string }) => {
        _sendMessage({ text: msg.content })
    };

    // Helper to extract text content from the new message structure
    const getMessageContent = (msg: any) => {
        if (!msg.parts) return ''
        return msg.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('')
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

    // Fetch user plan limits
    useEffect(() => {
        if (!isChatOpen) return;

        async function fetchPlanAndUsage() {
            setLoadingInfo(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('plan')
                .eq('id', user.id)
                .single()

            const isFree = profile?.plan === 'free'
            setIsFreeUser(isFree)

            if (isFree) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                const { count } = await supabase
                    .from('ai_chat_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('role', 'user')
                    .gte('created_at', today.toISOString())

                setMessagesUsed(count || 0)
            }
            setLoadingInfo(false)
        }

        fetchPlanAndUsage()
    }, [isChatOpen, supabase])

    if (!isChatOpen) return null

    const handleSendAction = (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        if (isFreeUser) {
            setMessagesUsed(prev => prev + 1)
        }
        
        append({ role: 'user', content: inputValue });
        setInputValue('');
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

    const handleSuggestion = (text: string) => {
        if (isFreeUser) setMessagesUsed(prev => prev + 1);
        append({ role: 'user', content: text });
    }

    const isLimitReached = isFreeUser && messagesUsed >= 5
    const isReadyToSubmit = inputValue.trim().length > 0 && !isLoading

    return (
        <div className="fixed inset-0 z-50 flex justify-end transition-opacity duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20" onClick={closeChat}></div>

            {/* Chat Panel */}
            <div className="relative w-full h-[85vh] mt-auto md:mt-0 md:h-full md:w-[380px] bg-white rounded-t-3xl md:rounded-l-3xl md:rounded-r-none shadow-2xl flex flex-col pt-2 animate-slide-up md:animate-slide-left">

                {/* Mobile drag handle */}
                <div className="w-12 h-1.5 bg-card-bg rounded-full mx-auto mb-4 md:hidden"></div>

                {/* Copy Toast Notification */}
                {showCopyToast && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] bg-navy/90 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg animate-fade-in flex items-center gap-2 border border-white/20 backdrop-blur-sm">
                        <span>📋 Copied!</span>
                    </div>
                )}

                {/* Header */}
                <div className="px-6 pb-4 flex justify-between items-start border-b border-page-bg">
                    <div>
                        <h2 className="text-[20px] font-semibold text-navy tracking-tight">Ask Focalyst AI</h2>
                        <p className="text-[11px] text-blue-muted">Powered by Gemini</p>
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
                                        className="bg-card-bg/20 border border-card-bg text-navy text-[13px] font-medium py-3 px-4 rounded-xl text-left hover:bg-card-bg/40 transition-colors"
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
                                            : 'bg-card-bg/30 text-navy rounded-tl-sm prose prose-sm prose-blue max-w-none prose-p:leading-relaxed prose-pre:my-0'
                                    }`}>
                                        {msg.role === 'assistant' ? (
                                            <>
                                                <ReactMarkdown>{content || (isLoading && msg.id === messages[messages.length-1]?.id ? '...' : '')}</ReactMarkdown>
                                                
                                                {/* Copy Button */}
                                                {content && content !== '...' && content !== '' && (
                                                    <button 
                                                        onClick={() => handleCopy(content)}
                                                        className="absolute -bottom-3 -right-2 bg-white border border-page-bg text-blue-muted hover:text-navy rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
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
                            <div className="bg-card-bg/30 rounded-2xl rounded-tl-sm px-4 py-3">
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
                <div className="absolute bottom-0 left-0 right-0 bg-white px-6 py-4 pb-safe border-t border-page-bg">
                    {chatError && (
                        <div className="mb-2 px-2 py-1.5 bg-red-50 border border-red-100 rounded-lg animate-fade-in">
                            <p className="text-[11px] text-red-600 font-medium">
                                ⚠️ {chatError.message || 'Focalyst AI is currently unavailable. Please try again.'}
                            </p>
                        </div>
                    )}
                    
                    {isLimitReached ? (
                        <div className="flex flex-col items-center gap-2 pb-2">
                            <p className="text-[13px] text-navy font-medium text-center">You've used all 5 free messages today.</p>
                            <p className="text-[12px] text-blue-muted text-center max-w-[260px] mb-2">Upgrade to Pro for unlimited AI chat 🚀</p>
                            <button onClick={() => window.location.href = '/plan'} className="bg-accent text-white font-semibold text-[14px] py-2.5 px-6 rounded-full shadow-md">
                                Upgrade Now
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSendAction} className="w-full">
                            <div className="bg-page-bg rounded-full flex items-center px-4 py-2 mb-2">
                                <button type="button" className="p-1 -ml-1 flex-shrink-0" aria-label="Voice input">
                                    <MicrophoneIcon size={20} color="#95A7B5" />
                                </button>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="flex-1 bg-transparent border-none outline-none px-3 text-[14px] text-navy placeholder:text-blue-muted min-w-0"
                                />
                                <button
                                    type="submit"
                                    disabled={!isReadyToSubmit}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity ${isReadyToSubmit ? 'bg-navy opacity-100' : 'bg-navy opacity-40'}`}
                                >
                                    <SendArrowIcon size={16} />
                                </button>
                            </div>
                            {!loadingInfo && isFreeUser && (
                                <p className="text-center text-[11px] text-blue-muted">
                                    {messagesUsed} of 5 daily messages used
                                </p>
                            )}
                        </form>
                    )}
                </div>

            </div>
        </div>
    )
}
