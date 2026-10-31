'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChat as useGlobalChat } from '@/context/ChatContext';
import { usePlan } from '@/context/PlanContext';
import { AlertCircle, ArrowUp, Check, Copy, Loader2, Mic, RotateCw, Sparkles, Square, X } from 'lucide-react';
import { useSwipeToClose } from '@/components/mobile/hooks';
import ReactMarkdown from 'react-markdown';
import { createClient } from '@/lib/supabase';
import { FREE_TIER_LIMITS } from '@/lib/featureGates';
import { useAuth } from '@/context/AuthContext';
import { useRecorder } from '@/lib/audio/useRecorder';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  streaming?: boolean;
}

export function ChatUI() {
  const { isChatOpen, closeChat } = useGlobalChat();
  const router = useRouter();
  const { refreshData } = usePlan();
  const { refreshUserProfile } = useAuth();
  const [isFreeUser, setIsFreeUser] = useState(false);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const swipe = useSwipeToClose(closeChat);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const [isWaitingFirstToken, setIsWaitingFirstToken] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [limitBannerVisible, setLimitBannerVisible] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

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
      setFeedbackNotice(recorderError);
    }
  }, [recorderError]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserPromptRef = useRef<string>('');

  const isLoading = status === 'loading';

  // Abort ongoing stream on close or unmount
  useEffect(() => {
    if (!isChatOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      cancelRecording();
    }
  }, [isChatOpen, cancelRecording]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const append = async (textToSend: string, isRetry = false) => {
    if (!textToSend.trim() || isLoading) return;

    setStatus('loading');
    setIsWaitingFirstToken(true);
    setFeedbackNotice(null);
    lastUserPromptRef.current = textToSend.trim();

    let newMessagesHistory: { role: string; content: string }[];

    if (isRetry) {
      // Remove any error message from state when retry starts
      setMessages((prev) => prev.filter((m) => !m.isError));
      // History uses existing non-error messages without adding another user message
      newMessagesHistory = messages
        .filter((m) => !m.isError)
        .map((m) => ({ role: m.role, content: m.content }));
    } else {
      const userMessageId = Date.now().toString();
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: textToSend.trim(),
      };
      setMessages((prev) => [...prev, userMessage]);
      newMessagesHistory = [
        ...messages.filter((m) => !m.isError).map((m) => ({ role: m.role, content: m.content })),
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
        body: JSON.stringify({ messages: newMessagesHistory }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 429 && (errJson.code === 'quota' || String(errJson.error || '').toLowerCase().includes('quota') || String(errJson.error || '').toLowerCase().includes('limit'))) {
          setLimitBannerVisible(true);
        }
        throw new Error(errJson.error || `Server returned status ${res.status}`);
      }

      if (!res.body) {
        throw new Error('Empty response from AI server');
      }

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setIsWaitingFirstToken(false);
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, content: acc } : m)));
      }
      acc += decoder.decode();
      setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, content: acc, streaming: false } : m)));

      setStatus('ready');
      setIsWaitingFirstToken(false);
      abortControllerRef.current = null;

      if (isFreeUser) {
        const nextCount = Math.min(messagesUsed + 1, FREE_TIER_LIMITS.aiMessagesPerDay);
        setMessagesUsed(nextCount);
        refreshUserProfile();
      }
      refreshData();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        setStatus('ready');
        setIsWaitingFirstToken(false);
        return;
      }

      console.error('[ChatUI]', error);
      setStatus('error');
      setIsWaitingFirstToken(false);
      abortControllerRef.current = null;

      const isQuota = String(error?.message || '').toLowerCase().includes('quota') || String(error?.message || '').toLowerCase().includes('used today');
      if (isQuota) {
        setLimitBannerVisible(true);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: 'Focalyst AI is busy right now. Please try again in a moment.',
          isError: true,
        },
      ]);
    }
  };

  const retryLastMessage = () => {
    if (lastUserPromptRef.current) {
      append(lastUserPromptRef.current, true);
    }
  };

  // Handle click on Microphone icon using useRecorder
  const handleMicClick = async () => {
    if (isTranscribing) return;

    if (isRecording) {
      const text = await stopRecording();
      if (text && text.trim()) {
        setInputValue((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
      }
      return;
    }

    setFeedbackNotice(null);
    await startRecording();
  };

  // Scroll to bottom on message updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isWaitingFirstToken, isLoading]);

  // Body scroll lock when chat is open
  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isChatOpen]);

  // Load user plan and usage
  useEffect(() => {
    if (!isChatOpen) return;

    async function fetchPlanAndUsage() {
      setLoadingInfo(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('plan, ai_message_count, last_message_date')
        .eq('id', user.id)
        .single();

      const isFree = !profile?.plan || profile.plan === 'free';
      setIsFreeUser(isFree);
      setMessagesUsed(profile?.ai_message_count || 0);
      setLoadingInfo(false);
    }

    fetchPlanAndUsage();
  }, [isChatOpen, supabase]);

  if (!isChatOpen) return null;

  const handleSendAction = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    if (isLimitReached) {
      setLimitBannerVisible(true);
      return;
    }

    const messageText = inputValue;
    setInputValue('');
    await append(messageText);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const suggestions = [
    'What should I focus on today?',
    'Add a task for tomorrow',
    'How productive was I this week?',
    'Remind me to review notes at 8pm',
  ];

  const handleSuggestion = async (text: string) => {
    if (isLimitReached) {
      setLimitBannerVisible(true);
      return;
    }
    await append(text);
  };

  const isLimitReached = isFreeUser && messagesUsed >= FREE_TIER_LIMITS.aiMessagesPerDay;
  const isReadyToSubmit = inputValue.trim().length > 0 && !isLoading && !isRecording;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Display only
  const messagesLeft = Math.max(0, FREE_TIER_LIMITS.aiMessagesPerDay - messagesUsed);
  const workingLabel = isLoading ? (isWaitingFirstToken ? 'Thinking…' : 'Writing…') : null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="chat-title">
      {/* Backdrop */}
      <div className="absolute inset-0 m-backdrop" onClick={closeChat} />

      {/* Chat Panel */}
      <div
        className="m-sheet relative w-full h-[calc(100dvh-env(safe-area-inset-top)-8px)] mt-auto md:mt-0 md:h-full md:w-[400px] md:rounded-[32px_0_0_32px] flex flex-col"
        style={swipe.style}
      >
        {/* Grabber + header: drag down to close */}
        <div {...swipe.handlers} className="touch-none shrink-0">
          <div className="pt-2 pb-1 flex justify-center md:hidden">
            <span aria-hidden className="m-grabber" />
          </div>

          {/* Header */}
          <div className="px-5 pt-2 pb-3 flex items-center gap-3">
            <span aria-hidden className="w-7 h-7 rounded-[9px] flex items-center justify-center bg-[var(--m-ai-bg)] text-[var(--m-ai-fg)] border border-[var(--m-ai-border)]">
              <Sparkles size={16} strokeWidth={1.75} />
            </span>
            <h2 id="chat-title" className="m-title-2 text-ink flex-1 min-w-0 truncate">Ask Focalyst AI</h2>
            {!loadingInfo && !isFreeUser && (
              <span className="m-chip m-chip-success !h-6 !text-[12px] shrink-0">
                <Check size={12} strokeWidth={2.5} aria-hidden />
                Pro
              </span>
            )}
            <button onClick={closeChat} className="m-icon-btn m-press -mr-1" aria-label="Close chat">
              <X size={20} strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>

        {/* Copy Toast */}
        {showCopyToast && (
          <div role="status" className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] m-blur border border-line text-ink px-4 h-9 inline-flex items-center rounded-full m-footnote shadow-[var(--shadow-glass)] animate-[m-rise_200ms_var(--ease)_both]">
            Copied
          </div>
        )}

        {/* Chat Area */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-6 flex flex-col gap-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center px-2">
              <span aria-hidden className="w-16 h-16 rounded-[20px] flex items-center justify-center bg-[var(--m-ai-bg)] text-[var(--m-ai-fg)] border border-[var(--m-ai-border)] shadow-[var(--m-glow)] mb-5">
                <Sparkles size={28} strokeWidth={1.75} />
              </span>
              <h3 className="m-title-3 text-ink">What should we look at today?</h3>
              <p className="m-footnote text-ink-2 mt-2 max-w-[280px]">
                I can add tasks, set reminders, sum up your week and answer questions about your focus.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-[340px]">
                {suggestions.map((text, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(text)}
                    className="m-pill m-press !h-auto min-h-10 py-2 text-left whitespace-normal"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              // Display only: show the AI tile on the first reply of a group
              const firstOfGroup = msg.role === 'assistant' && messages[idx - 1]?.role !== 'assistant';
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-[20px] rounded-br-[6px] px-4 py-2.5 bg-[image:var(--m-grad-primary)] text-snow m-body break-words">
                      {msg.content}
                    </div>
                  </div>
                );
              }
              if (msg.isError) {
                return (
                  <div key={msg.id} role="alert" className="flex items-start gap-3">
                    <span className="m-tile !w-6 !h-6 !rounded-[8px] !bg-[color-mix(in_srgb,var(--m-danger)_14%,transparent)] !border-[color-mix(in_srgb,var(--m-danger)_40%,transparent)] text-[var(--m-danger-text)] mt-0.5">
                      <AlertCircle size={14} strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="m-body text-ink">I couldn&apos;t reach Focalyst AI. Check your connection and try again.</p>
                      <button
                        type="button"
                        onClick={retryLastMessage}
                        className="m-pill m-press !h-9 !min-h-9 mt-3 !text-[13px]"
                      >
                        <RotateCw size={14} strokeWidth={1.75} aria-hidden />
                        Try again
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className="flex items-start gap-3">
                  {firstOfGroup ? (
                    <span aria-hidden className="shrink-0 mt-0.5 w-6 h-6 rounded-[8px] flex items-center justify-center bg-[var(--m-ai-bg)] text-[var(--m-ai-fg)] border border-[var(--m-ai-border)]">
                      <Sparkles size={14} strokeWidth={1.75} />
                    </span>
                  ) : (
                    <span aria-hidden className="shrink-0 w-6" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="m-body text-ink break-words prose prose-sm dark:prose-invert max-w-none prose-p:my-2 first:prose-p:mt-0 prose-p:text-[16px] prose-p:leading-[23px] prose-li:text-[16px] prose-headings:font-semibold prose-headings:text-ink prose-strong:text-ink prose-a:text-primary-text prose-pre:my-2 prose-p:text-ink prose-li:text-ink">
                      <ReactMarkdown>{msg.content || (isWaitingFirstToken && msg.id === messages[messages.length - 1]?.id ? '...' : '')}</ReactMarkdown>
                    </div>
                    {msg.content && (
                      <button
                        onClick={() => handleCopy(msg.content)}
                        className="m-press -ml-2 mt-1 w-11 h-9 inline-flex items-center justify-center rounded-full text-ink-2 hover:text-ink"
                        aria-label="Copy message"
                        title="Copy message"
                      >
                        <Copy size={16} strokeWidth={1.75} aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input & Dictation Area */}
        <div className="shrink-0 px-4 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
          {/* Working row */}
          {workingLabel && (
            <div role="status" className="flex items-center gap-2 px-2 pb-2 text-primary-text">
              <span aria-hidden className="m-dots flex items-center gap-1"><span /><span /><span /></span>
              <span className="m-footnote text-ink-2">{workingLabel}</span>
            </div>
          )}

          {(limitBannerVisible || isLimitReached) && isFreeUser && (
            <button
              type="button"
              onClick={() => {
                closeChat();
                router.push('/paywall');
              }}
              className="m-press mb-2 w-full rounded-[16px] border border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-primary-soft px-3 min-h-11 m-footnote !font-semibold text-ink"
            >
              Daily limit reached. See Pro
            </button>
          )}

          {feedbackNotice && (
            <div role="status" className="mb-2 px-3 py-2 rounded-[12px] bg-[color-mix(in_srgb,var(--m-warning)_14%,transparent)] border border-[color-mix(in_srgb,var(--m-warning)_40%,transparent)] flex items-center justify-between gap-2">
              <p className="m-footnote text-ink">
                {feedbackNotice}
              </p>
              <button
                type="button"
                onClick={() => setFeedbackNotice(null)}
                className="m-press m-footnote !font-semibold text-[var(--m-warning-text)] min-h-11 px-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {isLimitReached ? (
            <div className="flex flex-col items-center gap-1 pb-2 text-center">
              <p className="m-subhead text-ink">You have used today&apos;s Focalyst AI messages.</p>
              <p className="m-footnote text-ink-2 mb-3">Pro gives you more each day.</p>
              <button
                onClick={() => {
                  closeChat();
                  router.push('/paywall');
                }}
                className="m-btn m-btn-primary m-press"
              >
                See Pro
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendAction} className="w-full">
              {!loadingInfo && isFreeUser && (
                <div className="flex justify-center mb-2">
                  <span className="m-blur border border-line rounded-full h-7 px-3 inline-flex items-center m-caption text-ink-2 m-num">
                    {messagesLeft} {messagesLeft === 1 ? 'message' : 'messages'} left today
                  </span>
                </div>
              )}
              {isRecording ? (
                <div className="min-h-14 rounded-full flex items-center justify-between pl-4 pr-2 bg-[color-mix(in_srgb,var(--m-danger)_14%,transparent)] border border-[color-mix(in_srgb,var(--m-danger)_40%,transparent)]">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="w-2.5 h-2.5 rounded-full bg-[var(--m-danger)] animate-pulse" />
                    <span className="m-subhead m-num text-[var(--m-danger-text)]">
                      {formatTimer(recordingSeconds)}
                    </span>
                    <span className="m-footnote text-[var(--m-danger-text)]">Recording</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className="m-press inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[var(--m-danger)] text-snow m-footnote !font-semibold"
                  >
                    <Square size={12} fill="currentColor" aria-hidden />
                    <span>Done</span>
                  </button>
                </div>
              ) : isTranscribing ? (
                <div className="m-blur border border-line rounded-full min-h-14 flex items-center justify-center gap-2 px-4">
                  <Loader2 size={16} className="animate-spin text-primary-text" aria-hidden />
                  <span className="m-subhead text-ink">Transcribing</span>
                </div>
              ) : (
                <div className="m-blur border border-line rounded-full min-h-14 flex items-center gap-1 pl-1.5 pr-2 focus-within:border-[var(--m-brand-400)] shadow-[var(--m-card-shadow)]">
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className="m-press w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center text-ink-2 hover:text-ink"
                    aria-label="Voice input"
                    title="Dictate with voice"
                  >
                    <Mic size={20} strokeWidth={1.75} aria-hidden />
                  </button>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask anything"
                    aria-label="Message"
                    className="flex-1 bg-transparent border-none outline-none px-1 text-[16px] leading-[23px] text-ink placeholder:text-ink-3 min-w-0"
                  />
                  <button
                    type="submit"
                    disabled={!isReadyToSubmit}
                    aria-label="Send"
                    className={`m-press w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[image:var(--m-grad-primary)] text-snow ${
                      isReadyToSubmit ? 'shadow-[var(--m-glow)]' : 'opacity-40'
                    }`}
                  >
                    <ArrowUp size={20} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
