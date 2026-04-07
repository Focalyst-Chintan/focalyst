'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/context/ChatContext'
import { usePlan } from '@/context/PlanContext'
import { CloseIcon, MicrophoneIcon, SendArrowIcon } from '@/components/icons'
import ReactMarkdown from 'react-markdown'

export function ChatUI() {
    const { isChatOpen, closeChat, messages, addMessage, updateMessage, isTyping, setIsTyping } = useChat()
    const { refreshData } = usePlan()
    const [inputValue, setInputValue] = useState('')
    const [error, setError] = useState<string | null>(null)
    const chatContainerRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom when messages update or typing
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
    }, [messages, isTyping])

    // Body scroll lock when chat is open
    useEffect(() => {
        if (isChatOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }
        return () => { document.body.style.overflow = 'auto' }
    }, [isChatOpen])

    if (!isChatOpen) return null

    const handleSend = async () => {
        if (!inputValue.trim() || isTyping) return

        const userMsg = inputValue.trim()
        setInputValue('')
        setError(null)

        // Add user message
        const userMsgId = Date.now().toString()
        addMessage({ id: userMsgId, role: 'user', content: userMsg })
        
        setIsTyping(true)

        // Add placeholder assistant message for streaming
        const assistantMsgId = (Date.now() + 1).toString()
        addMessage({ id: assistantMsgId, role: 'assistant', content: '' })

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    messages: [...messages, { role: 'user', content: userMsg }] 
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to get response')
            }

            if (!response.body) {
                throw new Error('No response body')
            }

            const reader = response.body.getReader()
            const decoder = new TextEncoder().encode('').constructor === TextDecoder ? new TextDecoder() : new TextDecoder() // standard check
            let accumulatedContent = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = new TextDecoder().decode(value)
                accumulatedContent += chunk
                updateMessage(assistantMsgId, accumulatedContent)
            }

            // Refresh data in case AI performed actions (if we add them later)
            // refreshData()

        } catch (err: any) {
            console.error('Chat Error:', err)
            setError(err.message || 'Focalyst AI is currently experiencing high demand. Please try again soon.')
            updateMessage(assistantMsgId, err.message || 'Focalyst AI is currently experiencing high demand. Please try again soon.')
        } finally {
            setIsTyping(false)
        }
    }

    const suggestions = [
        "Summarize my recent notes",
        "Help me understand my latest thought",
        "What are my top productivity goals?",
        "Tutor me on a complex topic"
    ]

    return (
        <div className="fixed inset-0 z-50 flex justify-end transition-opacity duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeChat}></div>

            {/* Chat Panel */}
            <div className="relative w-full h-[90vh] mt-auto md:mt-0 md:h-full md:w-[450px] bg-white rounded-t-[2.5rem] md:rounded-l-[2.5rem] md:rounded-r-none shadow-2xl flex flex-col pt-2 animate-in fade-in slide-in-from-bottom md:slide-in-from-right duration-300">

                {/* Mobile drag handle */}
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 md:hidden"></div>

                {/* Header */}
                <div className="px-8 pb-6 flex justify-between items-start border-b border-gray-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Focalyst AI</h2>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Productivity Coach & Tutor</p>
                    </div>
                    <button onClick={closeChat} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close Chat">
                        <CloseIcon size={24} color="#6B7280" />
                    </button>
                </div>

                {/* Chat Area */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-8 py-8 pb-32 flex flex-col gap-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
                            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center animate-pulse">
                                <span className="text-4xl">✨</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">How can I help you today?</h3>
                                <p className="text-sm text-gray-500 max-w-[280px] mx-auto leading-relaxed">
                                    I've analyzed your recent notes and I'm ready to help you optimize your productivity.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                                {suggestions.map((text, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInputValue(text)}
                                        className="bg-gray-50 border border-gray-100 text-gray-700 text-sm font-medium py-3.5 px-5 rounded-2xl text-left hover:bg-blue-50 hover:border-blue-100 transition-all duration-200 active:scale-[0.98]"
                                    >
                                        {text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] rounded-[1.5rem] px-5 py-4 text-[15px] leading-relaxed shadow-sm ${
                                    msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-md'
                                        : 'bg-gray-50 text-gray-800 rounded-tl-md border border-gray-100'
                                }`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-sm prose-blue max-w-none prose-p:leading-relaxed prose-headings:text-gray-900 prose-headings:font-bold prose-strong:text-blue-700 prose-a:text-blue-600">
                                            <ReactMarkdown>{msg.content || (isTyping && msg.id === messages[messages.length-1].id ? '...' : '')}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))
                    )}

                    {/* Loading/Typing State */}
                    {isTyping && messages[messages.length-1]?.role === 'user' && (
                        <div className="flex justify-start">
                            <div className="bg-gray-50 rounded-[1.5rem] rounded-tl-md px-5 py-4 border border-gray-100">
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md px-6 py-6 pb-24 border-t border-gray-50">
                    <div className="relative flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors" aria-label="Voice input">
                            <MicrophoneIcon size={22} />
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSend()
                                }
                            }}
                            placeholder="Ask Focalyst anything..."
                            className="flex-1 bg-transparent border-none outline-none py-2 text-[15px] text-gray-900 placeholder:text-gray-400"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isTyping}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                inputValue.trim() && !isTyping 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-100' 
                                    : 'bg-gray-200 text-gray-400 scale-95 opacity-50 cursor-not-allowed'
                            }`}
                        >
                            <SendArrowIcon size={20} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
