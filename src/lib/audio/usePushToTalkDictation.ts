'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface UsePushToTalkDictationOptions {
  enabled?: boolean;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  inputValue: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  isRecording: boolean;
  isTranscribing: boolean;
}

export interface UsePushToTalkDictationReturn {
  isPushToTalkActive: boolean;
}

export function usePushToTalkDictation({
  enabled = true,
  inputRef,
  inputValue,
  setInputValue,
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  isTranscribing,
}: UsePushToTalkDictationOptions): UsePushToTalkDictationReturn {
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);

  const isPushToTalkActiveRef = useRef(false);
  const isKeyHeldRef = useRef(false);
  const isInitializingRef = useRef(false);
  const keyReleasedDuringInitRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest values in refs to avoid stale closures in event listeners
  const inputRefLatest = useRef(inputRef);
  const inputValueLatest = useRef(inputValue);
  const setInputValueLatest = useRef(setInputValue);
  const startRecordingLatest = useRef(startRecording);
  const stopRecordingLatest = useRef(stopRecording);
  const cancelRecordingLatest = useRef(cancelRecording);
  const isRecordingLatest = useRef(isRecording);
  const isTranscribingLatest = useRef(isTranscribing);
  const enabledLatest = useRef(enabled);

  useEffect(() => {
    inputRefLatest.current = inputRef;
    inputValueLatest.current = inputValue;
    setInputValueLatest.current = setInputValue;
    startRecordingLatest.current = startRecording;
    stopRecordingLatest.current = stopRecording;
    cancelRecordingLatest.current = cancelRecording;
    isRecordingLatest.current = isRecording;
    isTranscribingLatest.current = isTranscribing;
    enabledLatest.current = enabled;
  });

  const triggerStartDictation = useCallback(async () => {
    if (isPushToTalkActiveRef.current || isInitializingRef.current) return;
    if (isTranscribingLatest.current) return;

    isPushToTalkActiveRef.current = true;
    setIsPushToTalkActive(true);
    isInitializingRef.current = true;
    keyReleasedDuringInitRef.current = false;

    try {
      const started = await startRecordingLatest.current();
      isInitializingRef.current = false;

      // Quick-Release Guard: if the user released the Spacebar while getUserMedia was resolving
      if (keyReleasedDuringInitRef.current || !isPushToTalkActiveRef.current) {
        if (started || isRecordingLatest.current) {
          const text = await stopRecordingLatest.current();
          if (text && text.trim()) {
            setInputValueLatest.current((prev) =>
              prev ? `${prev} ${text.trim()}` : text.trim()
            );
          }
        } else {
          cancelRecordingLatest.current();
        }
        isPushToTalkActiveRef.current = false;
        setIsPushToTalkActive(false);
      }
    } catch {
      isInitializingRef.current = false;
      isPushToTalkActiveRef.current = false;
      setIsPushToTalkActive(false);
    }
  }, []);

  const triggerStopDictation = useCallback(async () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isInitializingRef.current) {
      // User released while recorder is still initializing
      keyReleasedDuringInitRef.current = true;
      isPushToTalkActiveRef.current = false;
      setIsPushToTalkActive(false);
      return;
    }

    if (isPushToTalkActiveRef.current) {
      isPushToTalkActiveRef.current = false;
      setIsPushToTalkActive(false);

      try {
        const text = await stopRecordingLatest.current();
        if (text && text.trim()) {
          setInputValueLatest.current((prev) =>
            prev ? `${prev} ${text.trim()}` : text.trim()
          );
        }
      } catch {
        cancelRecordingLatest.current();
      }
    }
  }, []);

  const handleAbort = useCallback(() => {
    isKeyHeldRef.current = false;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (isInitializingRef.current) {
      keyReleasedDuringInitRef.current = true;
    }

    if (isPushToTalkActiveRef.current) {
      isPushToTalkActiveRef.current = false;
      setIsPushToTalkActive(false);
      cancelRecordingLatest.current();
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      handleAbort();
      return;
    }

    const isElementEditable = (element: Element | null): boolean => {
      if (!element) return false;
      const tagName = element.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return true;
      }
      if ((element as HTMLElement).isContentEditable) {
        return true;
      }
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!enabledLatest.current) return;

      const activeEl = document.activeElement;
      const chatInputEl = inputRefLatest.current.current;
      const isChatInputFocused = Boolean(chatInputEl && activeEl === chatInputEl);

      // Guardrail: Ignore unrelated inputs on the page outside the AI chat
      if (!isChatInputFocused && isElementEditable(activeEl)) {
        return;
      }

      // Check current text in the chat input
      const currentVal = isChatInputFocused
        ? chatInputEl?.value ?? inputValueLatest.current
        : inputValueLatest.current;
      const isChatEmpty = currentVal.trim() === '';

      // Case A: AI Chat Input is NOT focused, OR AI Chat Input IS focused and currently empty
      if (!isChatInputFocused || isChatEmpty) {
        e.preventDefault();

        // Ignore repeat events while held
        if (e.repeat) return;

        isKeyHeldRef.current = true;

        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
        }

        // Tiny 150ms hold timer for deliberate press
        holdTimerRef.current = setTimeout(() => {
          if (isKeyHeldRef.current) {
            triggerStartDictation();
          }
        }, 150);

        return;
      }

      // Case B: AI Chat Input IS focused and already contains text
      // Normal typing tap is < 150-200ms. If e.repeat fires, user is holding Spacebar.
      if (e.repeat) {
        e.preventDefault();

        if (!isPushToTalkActiveRef.current && !isInitializingRef.current) {
          isKeyHeldRef.current = true;

          // Strip the single trailing space that was inserted on initial keydown
          setInputValueLatest.current((prev) => {
            if (prev.endsWith(' ')) {
              return prev.slice(0, -1);
            }
            return prev;
          });

          // Blur or prevent further spaces
          chatInputEl?.blur();

          triggerStartDictation();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;

      isKeyHeldRef.current = false;

      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      if (isPushToTalkActiveRef.current || isInitializingRef.current) {
        e.preventDefault();
        triggerStopDictation();
      }
    };

    const handleWindowBlur = () => {
      handleAbort();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleAbort();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, [enabled, triggerStartDictation, triggerStopDictation, handleAbort]);

  return {
    isPushToTalkActive,
  };
}
