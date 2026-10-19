'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, X, Sparkles, ArrowUp, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { createClient } from '@/lib/supabase';

interface AIDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AIDrawer({ open, onClose }: AIDrawerProps) {
  const { user, plan, refreshUserProfile } = useAuth();
  const { refreshData } = usePlan();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const [chatError, setChatError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const isPro = plan !== 'free';
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const getMessageContent = (msg: any) => {
    if (msg.content) return msg.content;
    if (!msg.parts) return '';
    return msg.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('');
  };

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || status === 'loading') return;

    setStatus('loading');
    setChatError(null);

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      parts: [{ type: 'text', text: textToSend.trim() }],
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    const newHistory = [
      ...messages.map((m) => ({
        role: m.role,
        content: getMessageContent(m),
      })),
      { role: 'user', content: textToSend.trim() },
    ];

    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        if (refreshedSession) {
          session = refreshedSession;
        }
      }

      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      // Stream assistant response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      const assistantId = (Date.now() + 1).toString();

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', parts: [{ type: 'text', text: '' }] },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: assistantText, parts: [{ type: 'text', text: assistantText }] }
                : m
            )
          );
        }
      }

      setStatus('ready');
      refreshData();
      refreshUserProfile();
    } catch (err: any) {
      console.error('AI Drawer error:', err);
      setChatError(err.message || 'Something went wrong.');
      setStatus('error');
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setChatError(null);
    setStatus('ready');
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop (no blur so user sees dashboard) */}
      <div
        className="fixed inset-0 z-40 bg-[#05070F]/20"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside
        className="fixed top-3 right-3 bottom-3 z-50 w-[420px] rounded-[28px] glass-strong liquid flex flex-col overflow-hidden animate-in slide-in-from-right duration-[220ms] ease-[var(--ease)] shadow-[var(--shadow-3)]"
      >
        {/* Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-line shrink-0 relative z-10">
          <span className="text-[17px] font-semibold text-ink">Ask Focalyst AI</span>
          <div className="flex items-center gap-1">
            <IconButton
              size="sm"
              variant="ghost"
              tooltip="New chat"
              onClick={handleResetChat}
            >
              <RotateCcw className="w-4 h-4 text-ink-2" />
            </IconButton>
            <IconButton
              size="sm"
              variant="ghost"
              tooltip="Close Esc"
              onClick={onClose}
            >
              <X className="w-4 h-4 text-ink-2" />
            </IconButton>
          </div>
        </div>

        {/* Ambient Glow layer at bottom */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] z-0 dark:block hidden"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(25,81,252,0.45) 70%, rgba(55,129,252,0.75)), radial-gradient(ellipse 70% 60% at 50% 100%, rgba(111,160,255,0.4), transparent)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] z-0 dark:hidden block"
          style={{
            background:
              'linear-gradient(to bottom, transparent, rgba(203,233,253,0.8) 65%, rgba(169,198,255,0.95)), radial-gradient(ellipse 70% 60% at 50% 100%, rgba(61,111,224,0.20), transparent)',
          }}
        />

        {/* Body content */}
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col justify-between relative z-10 overflow-y-auto">
            {/* Top greeting */}
            <div className="px-5 pt-7">
              <h2 className="font-display text-[36px]/[42px] tracking-[-0.015em] text-ink">
                Hello <span className="text-primary-text">{firstName}</span>
                <br />
                May I help you?
              </h2>
            </div>

            {/* Pushed to bottom suggested chips */}
            <div className="mt-auto px-5 pb-3 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => sendMessage('Tell me about my habit consistency')}
                className="h-12 rounded-[16px] px-4 bg-surface/70 dark:bg-surface-2/70 border border-line text-[14px] font-medium text-ink text-left transition-all hover:-translate-y-px hover:border-line-strong backdrop-blur-sm"
              >
                Tell me about my habit consistency
              </button>
              <button
                type="button"
                onClick={() => sendMessage('Add a task for tomorrow')}
                className="h-12 rounded-[16px] px-4 bg-surface/70 dark:bg-surface-2/70 border border-line text-[14px] font-medium text-ink text-left transition-all hover:-translate-y-px hover:border-line-strong backdrop-blur-sm"
              >
                Add a task for tomorrow
              </button>
              <button
                type="button"
                onClick={() => sendMessage('How productive was I this week?')}
                className="h-12 rounded-[16px] px-4 bg-surface/70 dark:bg-surface-2/70 border border-line text-[14px] font-medium text-ink text-left transition-all hover:-translate-y-px hover:border-line-strong backdrop-blur-sm"
              >
                How productive was I this week?
              </button>
              <p className="text-[12px] text-ink-3 text-center mt-1">
                I can add tasks, set reminders, summarise your week, and answer productivity questions.
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 relative z-10"
          >
            {messages.map((m) => {
              const content = getMessageContent(m);
              const isUser = m.role === 'user';
              if (isUser) {
                return (
                  <div
                    key={m.id}
                    className="ml-auto max-w-[80%] rounded-[18px] rounded-br-[6px] bg-primary px-3.5 py-2.5 text-[14px]/[22px] text-snow shadow-sm"
                  >
                    {content}
                  </div>
                );
              }
              return (
                <div key={m.id} className="flex items-start gap-2.5 text-[14px]/[22px] text-ink">
                  <Sparkles className="w-5 h-5 text-primary-text shrink-0 mt-0.5" />
                  <div className="flex-1 prose prose-sm dark:prose-invert max-w-none break-words">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}

            {status === 'loading' && (
              <div className="flex items-center gap-2 text-[13px] text-ink-3">
                <Sparkles className="w-4 h-4 text-primary-text animate-pulse" />
                <span>Thinking...</span>
              </div>
            )}

            {chatError && (
              <div className="rounded-[12px] bg-danger/10 border border-danger/20 p-3 text-[13px] text-danger">
                {chatError}
              </div>
            )}
          </div>
        )}

        {/* Input Bar (NO divider line above it) */}
        <div className="m-4 relative z-10 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputValue);
            }}
            className="h-14 rounded-full glass pl-5 pr-2 flex items-center gap-2 shadow-sm"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 outline-none"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || status === 'loading'}
              className="h-10 w-10 rounded-full bg-primary text-snow flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 transition-colors shrink-0"
            >
              <ArrowUp className="w-[18px] h-[18px]" />
            </button>
          </form>
          {isPro && (
            <p className="text-[12px] text-ink-3 text-center mt-1.5">
              Focalyst Pro Active
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
