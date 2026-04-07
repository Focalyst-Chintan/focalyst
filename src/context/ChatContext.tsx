'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatContextType {
    isChatOpen: boolean;
    openChat: () => void;
    closeChat: () => void;
    messages: ChatMessage[];
    addMessage: (message: ChatMessage) => void;
    updateMessage: (id: string, content: string) => void;
    setMessages: (messages: ChatMessage[]) => void;
    isTyping: boolean;
    setIsTyping: (typing: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isTyping, setIsTyping] = useState(false)

    const openChat = () => setIsChatOpen(true)
    const closeChat = () => setIsChatOpen(false)
    const addMessage = (message: ChatMessage) => setMessages(prev => [...prev, message])
    const updateMessage = (id: string, content: string) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m))
    }

    return (
        <ChatContext.Provider value={{
            isChatOpen, openChat, closeChat,
            messages, addMessage, updateMessage, setMessages,
            isTyping, setIsTyping
        }}>
            {children}
        </ChatContext.Provider>
    )
}

export function useChat() {
    const context = useContext(ChatContext)
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider')
    }
    return context
}
