'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChat as useGlobalChat } from '@/context/ChatContext';
import { usePlan } from '@/context/PlanContext';
import { CloseIcon, SendArrowIcon } from '@/components/icons';
import { Mic, Square, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { createClient } from '@/lib/supabase';
import { FREE_TIER_LIMITS } from '@/lib/featureGates';
import { useAuth } from '@/context/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const [isWaitingFirstToken, setIsWaitingFirstToken] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [limitBannerVisible, setLimitBannerVisible] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
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
      stopVoiceRecording(false);
    }
  }, [isChatOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const append = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setStatus('loading');
    setIsWaitingFirstToken(true);
    setFeedbackNotice(null);
    lastUserPromptRef.current = textToSend.trim();

    const userMessageId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const newMessagesHistory = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: textToSend.trim() },
    ];

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
      let assistantReply = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setIsWaitingFirstToken(false);
          assistantReply += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: assistantReply } : m
            )
          );
        }
      }

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
      append(lastUserPromptRef.current);
    }
  };

  // Stop recording helper
  const stopVoiceRecording = useCallback(async (shouldProcess = true) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const rec = mediaRecorderRef.current;
    if (!rec) {
      setIsRecording(false);
      setRecordingSeconds(0);
      return;
    }

    if (rec.state !== 'inactive') {
      rec.onstop = async () => {
        setIsRecording(false);
        const tracks = rec.stream?.getTracks();
        tracks?.forEach((t) => t.stop());

        if (!shouldProcess) {
          setRecordingSeconds(0);
          audioChunksRef.current = [];
          return;
        }

        const mime = rec.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        audioChunksRef.current = [];
        setRecordingSeconds(0);

        if (blob.size === 0) {
          setFeedbackNotice('Could not process that recording. Please try again.');
          return;
        }

        if (blob.size > 4 * 1024 * 1024) {
          setFeedbackNotice('That recording is too long. Keep voice notes under 10 minutes.');
          return;
        }

        try {
          setIsTranscribing(true);
          const { data: { session } } = await supabase.auth.getSession();
          const ext = mime.includes('mp4') ? 'mp4' : (mime.includes('webm') ? 'webm' : 'wav');
          const formData = new FormData();
          formData.append('file', blob, `voice-dictation.${ext}`);

          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: {
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: formData,
          });

          if (!res.ok) {
            throw new Error('Transcription failed');
          }

          const data = await res.json();
          if (data.text && data.text.trim()) {
            setInputValue((prev) => (prev ? `${prev} ${data.text.trim()}` : data.text.trim()));
          } else {
            setFeedbackNotice('Could not process that recording. Please try again.');
          }
        } catch (transcribeErr) {
          console.error('[Dictation]', transcribeErr);
          setFeedbackNotice('Could not process that recording. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };

      try {
        rec.stop();
      } catch {
        setIsRecording(false);
        setRecordingSeconds(0);
      }
    } else {
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  }, [supabase]);

  // Handle click on Microphone icon
  const handleMicClick = async () => {
    if (isTranscribing) return;

    if (isRecording) {
      stopVoiceRecording(true);
      return;
    }

    setFeedbackNotice(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setFeedbackNotice('Allow microphone access in your browser settings to record.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const preferredMimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      let chosenMime = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        for (const candidate of preferredMimes) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            chosenMime = candidate;
            break;
          }
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: chosenMime,
        audioBitsPerSecond: 32000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start 1-second interval timer capped at 10 minutes (600s)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          if (next >= 600) {
            stopVoiceRecording(true);
            return 600;
          }
          return next;
        });
      }, 1000);
    } catch (micErr: any) {
      console.error('[Mic Permission]', micErr);
      setFeedbackNotice('Allow microphone access in your browser settings to record.');
    }
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end transition-opacity duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={closeChat} />

      {/* Chat Panel */}
      <div className="relative w-full h-[85vh] mt-auto md:mt-0 md:h-full md:w-[380px] bg-snow dark:bg-slate-900 rounded-t-3xl md:rounded-l-3xl md:rounded-r-none shadow-2xl flex flex-col pt-2 animate-slide-up md:animate-slide-left transition-colors">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-card-bg dark:bg-slate-700 rounded-full mx-auto mb-4 md:hidden" />

        {/* Copy Toast */}
        {showCopyToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] bg-navy/90 text-snow px-4 py-2 rounded-full text-xs font-semibold shadow-lg animate-fade-in flex items-center gap-2 border border-snow/20 backdrop-blur-sm">
            <span>Copied</span>
          </div>
        )}

        {/* Header */}
        <div className="px-6 pb-4 flex justify-between items-start border-b border-page-bg dark:border-slate-800">
          <div>
            <h2 className="text-[20px] font-semibold text-navy dark:text-slate-100 tracking-tight">Ask Focalyst AI</h2>
            <p className="text-[11px] text-blue-muted dark:text-slate-400">Personal productivity assistant</p>
          </div>
          <button onClick={closeChat} className="p-1 -mr-1" aria-label="Close Chat">
            <CloseIcon size={24} color="#95A7B5" />
          </button>
        </div>

        {/* Chat Area */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 pb-28 flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center mt-[-40px]">
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
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group relative`}>
                <div
                  className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-navy text-snow rounded-tr-sm'
                      : msg.isError
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 rounded-tl-sm'
                      : 'bg-card-bg/30 dark:bg-slate-800 text-navy dark:text-slate-200 rounded-tl-sm prose prose-sm prose-blue dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:my-0'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      <ReactMarkdown>{msg.content || (isWaitingFirstToken && msg.id === messages[messages.length - 1]?.id ? '...' : '')}</ReactMarkdown>

                      {msg.isError && (
                        <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-900/60">
                          <button
                            type="button"
                            onClick={retryLastMessage}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {!msg.isError && msg.content && (
                        <button
                          onClick={() => handleCopy(msg.content)}
                          className="absolute -bottom-3 -right-2 bg-snow dark:bg-slate-700 border border-page-bg dark:border-slate-600 text-blue-muted hover:text-navy dark:hover:text-slate-200 rounded-full p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy message"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      )}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator dots until first words arrive */}
          {isLoading && isWaitingFirstToken && (
            <div className="flex justify-start">
              <div className="bg-card-bg/30 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 pt-1">
                  <div className="w-1.5 h-1.5 bg-blue-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-blue-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-blue-muted rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input & Dictation Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-snow dark:bg-slate-900 px-6 py-4 pb-safe border-t border-page-bg dark:border-slate-800 transition-colors">
          {(limitBannerVisible || isLimitReached) && isFreeUser && (
            <button
              type="button"
              onClick={() => {
                closeChat();
                router.push('/paywall');
              }}
              className="mb-2 w-full rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-navy dark:text-slate-100 hover:bg-accent/15 transition-colors"
            >
              Daily AI limit reached. Upgrade to Pro
            </button>
          )}

          {feedbackNotice && (
            <div className="mb-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg animate-fade-in flex items-center justify-between">
              <p className="text-[11px] text-amber-800 dark:text-amber-200 font-medium">
                {feedbackNotice}
              </p>
              <button
                type="button"
                onClick={() => setFeedbackNotice(null)}
                className="text-amber-600 dark:text-amber-400 text-xs ml-2 hover:opacity-75"
              >
                Dismiss
              </button>
            </div>
          )}

          {isLimitReached ? (
            <div className="flex flex-col items-center gap-2 pb-2">
              <p className="text-[13px] text-navy font-medium text-center">You have used today's Focalyst AI messages.</p>
              <p className="text-[12px] text-blue-muted text-center max-w-[260px] mb-2">Upgrade to Pro for more</p>
              <button
                onClick={() => {
                  closeChat();
                  router.push('/paywall');
                }}
                className="bg-accent text-snow font-semibold text-[14px] py-2.5 px-6 rounded-full shadow-md"
              >
                Upgrade Now
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendAction} className="w-full">
              {isRecording ? (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-full flex items-center justify-between px-4 py-2 mb-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[13px] font-mono text-red-600 dark:text-red-300 font-semibold">
                      {formatTimer(recordingSeconds)}
                    </span>
                    <span className="text-[12px] text-red-500 dark:text-red-400">Recording</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stopVoiceRecording(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-snow text-[12px] font-medium hover:bg-red-700 transition-colors"
                  >
                    <Square size={12} fill="currentColor" />
                    <span>Done</span>
                  </button>
                </div>
              ) : isTranscribing ? (
                <div className="bg-page-bg dark:bg-slate-950 border border-transparent dark:border-slate-800 rounded-full flex items-center justify-center gap-2 px-4 py-2.5 mb-2">
                  <Loader2 size={16} className="animate-spin text-navy dark:text-slate-300" />
                  <span className="text-[13px] text-navy dark:text-slate-200 font-medium">Transcribing speech</span>
                </div>
              ) : (
                <div className="bg-page-bg dark:bg-slate-950 border border-transparent dark:border-slate-800 rounded-full flex items-center px-4 py-2 mb-2">
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className="p-1 -ml-1 flex-shrink-0 text-blue-muted hover:text-navy dark:hover:text-slate-200 transition-colors"
                    aria-label="Voice input"
                    title="Dictate with voice"
                  >
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
                        ? 'bg-navy dark:bg-blue-500 text-snow opacity-100'
                        : 'bg-navy dark:bg-blue-500/40 text-snow opacity-40'
                    }`}
                  >
                    <SendArrowIcon size={16} />
                  </button>
                </div>
              )}
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
  );
}
