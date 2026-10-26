'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, X, Sparkles, ArrowUp, Mic, Square, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { IconButton } from '@/components/desktop/ui/IconButton';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/context/PlanContext';
import { createClient } from '@/lib/supabase';
import { getDisplayName, getFirstName } from '@/lib/utils/name';
import { useRecorder } from '@/lib/audio/useRecorder';

interface AIDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AIDrawer({ open, onClose }: AIDrawerProps) {
  const { user, profile, plan, refreshUserProfile } = useAuth();
  const { refreshData } = usePlan();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const [chatError, setChatError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [dictationNotice, setDictationNotice] = useState<string | null>(null);

  // Shared recorder hook
  const {
    isRecording,
    isTranscribing,
    recordingSeconds,
    error: recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useRecorder();

  useEffect(() => {
    if (recorderError) {
      setDictationNotice(recorderError);
    }
  }, [recorderError]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserPromptRef = useRef<string>('');

  const supabase = createClient();
  const isPro = plan !== 'free';
  const displayName = getDisplayName(profile, user);
  const firstName = getFirstName(displayName);

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      cancelRecording();
    }
  }, [open, cancelRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  const sendMessage = async (textToSend: string, isRetry = false) => {
    if (!textToSend.trim() || status === 'loading') return;

    setStatus('loading');
    setChatError(null);
    setIsQuotaError(false);
    lastUserPromptRef.current = textToSend.trim();

    let newHistory: { role: string; content: string }[];

    if (isRetry) {
      // The user message is already in messages; do not add a duplicate bubble
      newHistory = messages.map((m) => ({
        role: m.role,
        content: getMessageContent(m),
      }));
    } else {
      const userMessage = {
        role: 'user',
        content: textToSend.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');

      newHistory = [
        ...messages.map((m) => ({
          role: m.role,
          content: getMessageContent(m),
        })),
        { role: 'user', content: textToSend.trim() },
      ];
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

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

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: newHistory }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 429 && (errJson.code === 'quota' || String(errJson.error || '').toLowerCase().includes('quota'))) {
          setIsQuotaError(true);
        }
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      // Stream assistant response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      const assistantId = (Date.now() + 1).toString();

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', parts: [{ type: 'text', text: '' }] },
      ]);

      if (reader) {
        let acc = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: acc, parts: [{ type: 'text', text: acc }] }
                : m
            )
          );
        }
        acc += decoder.decode();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: acc, parts: [{ type: 'text', text: acc }], streaming: false }
              : m
          )
        );
      }

      setStatus('ready');
      abortControllerRef.current = null;
      refreshData();
      refreshUserProfile();
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setStatus('ready');
        return;
      }
      console.error('AI Drawer error:', err);
      const isQuota = String(err?.message || '').toLowerCase().includes('quota') || String(err?.message || '').toLowerCase().includes('used today');
      if (isQuota) {
        setIsQuotaError(true);
      }
      setChatError('Focalyst AI is busy right now. Please try again in a moment.');
      setStatus('error');
      abortControllerRef.current = null;
    }
  };

  const retryLastMessage = () => {
    if (lastUserPromptRef.current) {
      sendMessage(lastUserPromptRef.current, true);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setChatError(null);
    setIsQuotaError(false);
    setStatus('ready');
  };

  const handleMicClick = async () => {
    if (isTranscribing) return;

    if (isRecording) {
      const text = await stopRecording();
      if (text && text.trim()) {
        setInputValue((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
      }
      return;
    }

    setDictationNotice(null);
    await startRecording();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[#05070F]/20"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-[420px] max-w-[90vw] bg-surface border-l border-line-subtle shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-[240px] h-[240px] bg-primary/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20" />

        {/* Header */}
        <div className="h-16 px-5 border-b border-line-subtle flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-text" />
            </div>
            <div>
              <h2 className="font-ui text-[15px] font-semibold text-ink">
                Focalyst AI
              </h2>
              <p className="text-[11px] text-ink-3">
                {isPro ? 'Pro Active' : 'Free tier'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Reset chat"
              tooltip="New chat"
              onClick={handleResetChat}
            >
              <RotateCcw className="w-4 h-4" />
            </IconButton>
            <IconButton
              aria-label="Close drawer"
              tooltip="Close"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        </div>

        {/* Notice banners */}
        {dictationNotice && (
          <div className="px-5 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 flex items-center justify-between text-[12px] text-amber-800 dark:text-amber-200">
            <span>{dictationNotice}</span>
            <button onClick={() => setDictationNotice(null)} className="ml-2 font-medium hover:opacity-75">
              Dismiss
            </button>
          </div>
        )}

        {isQuotaError && (
          <div className="px-5 py-2.5 bg-accent/10 border-b border-accent/20 flex items-center justify-between text-[12px] text-accent-dark font-medium">
            <span>You have used today's Focalyst AI messages.</span>
            <a href="/paywall" className="underline font-semibold ml-2">Upgrade to Pro</a>
          </div>
        )}

        {/* Content Area */}
        {messages.length === 0 ? (
          <div className="flex-1 p-6 flex flex-col justify-center items-center text-center overflow-y-auto relative z-10">
            <div className="w-12 h-12 rounded-[16px] bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary-text" />
            </div>
            <h3 className="font-display text-[22px] font-normal text-ink mb-2">
              How can I help, {firstName}?
            </h3>
            <p className="text-[13px] text-ink-3 max-w-[280px] leading-relaxed mb-6">
              I can analyze your productivity, reschedule tasks, or generate your weekly report.
            </p>

            {/* Prompt Starter Chips */}
            <div className="w-full flex flex-col gap-2">
              {[
                'How productive was I this week?',
                'What should I focus on today?',
                'Summarize my notes',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  className="w-full p-3 rounded-[14px] bg-surface-2 border border-line-subtle text-left text-[13px] text-ink hover:border-line-strong hover:bg-surface-3 transition-colors duration-150 flex items-center justify-between group"
                >
                  <span>{chip}</span>
                  <ArrowUp className="w-3.5 h-3.5 text-ink-4 group-hover:text-ink-2 transition-colors transform rotate-45" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex-1 p-5 overflow-y-auto space-y-4 relative z-10"
          >
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              const content = getMessageContent(m);

              return (
                <div
                  key={idx}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={
                      isUser
                        ? 'ml-auto max-w-[80%] rounded-[18px] rounded-br-[6px] bg-primary px-3.5 py-2.5 text-[14px]/[22px] text-snow shadow-sm'
                        : 'mr-auto max-w-[85%] rounded-[18px] rounded-tl-[6px] bg-surface-2 border border-line-subtle px-4 py-3 text-[14px]/[22px] text-ink'
                    }
                  >
                    {isUser ? (
                      content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{content}</ReactMarkdown>
                      </div>
                    )}
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
              <div className="rounded-[12px] bg-danger/10 border border-danger/20 p-3 text-[13px] text-danger flex items-center justify-between">
                <span>{chatError}</span>
                <button
                  type="button"
                  onClick={retryLastMessage}
                  className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-danger/20 hover:bg-danger/30 text-danger transition-colors ml-2"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input Bar */}
        <div className="m-4 relative z-10 shrink-0">
          {isRecording ? (
            <div className="h-14 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-5 flex items-center justify-between shadow-sm animate-pulse">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-[14px] font-mono font-semibold text-red-600 dark:text-red-300">
                  {formatTimer(recordingSeconds)}
                </span>
                <span className="text-[13px] text-red-500">Recording</span>
              </div>
              <button
                type="button"
                onClick={handleMicClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-snow text-[12px] font-medium hover:bg-red-700 transition-colors"
              >
                <Square size={12} fill="currentColor" />
                <span>Done</span>
              </button>
            </div>
          ) : isTranscribing ? (
            <div className="h-14 rounded-full glass px-5 flex items-center justify-center gap-2 text-[14px] text-ink font-medium shadow-sm">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span>Transcribing speech...</span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputValue);
              }}
              className="h-14 rounded-full glass pl-3 pr-2 flex items-center gap-2 shadow-sm"
            >
              <button
                type="button"
                onClick={handleMicClick}
                className="p-2 text-ink-3 hover:text-ink transition-colors rounded-full"
                aria-label="Voice input"
                title="Dictate with voice"
              >
                <Mic size={18} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 outline-none min-w-0"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || status === 'loading'}
                className="h-10 w-10 rounded-full bg-primary text-snow flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 transition-colors shrink-0"
              >
                <ArrowUp className="w-[18px] h-[18px]" />
              </button>
            </form>
          )}
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
