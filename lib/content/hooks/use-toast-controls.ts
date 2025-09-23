import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastMessageOptions {
  autoHide?: boolean;
  duration?: number;
  reducedMotion?: boolean;
}

export interface ToastPayload {
  text: string;
  options?: ToastMessageOptions;
}

export interface ToastBridge {
  enqueue: (message: string, options?: ToastMessageOptions) => void;
  register: (handler: (payload: ToastPayload) => void) => () => void;
}

export function createToastBridge(): ToastBridge {
  let pending: ToastPayload | null = null;
  let activeHandler: ((payload: ToastPayload) => void) | null = null;

  return {
    enqueue: (message: string, options?: ToastMessageOptions) => {
      const payload: ToastPayload = { text: message, options };
      if (activeHandler) {
        activeHandler(payload);
      } else {
        pending = payload;
      }
    },
    register: (handler: (payload: ToastPayload) => void) => {
      activeHandler = handler;

      if (pending) {
        const queued = pending;
        pending = null;
        handler(queued);
      }

      return () => {
        activeHandler = null;
      };
    },
  };
}

interface UseToastControlsOptions {
  bridge: ToastBridge;
  reducedMotion: boolean;
}

interface UseToastControlsResult {
  message: string | null;
  showCard: boolean;
  closeToast: () => void;
  registerToastHandler: () => () => void;
}

export function useToastControls({
  bridge,
  reducedMotion,
}: UseToastControlsOptions): UseToastControlsResult {
  const [message, setMessage] = useState<string | null>(null);
  const messageRef = useRef<string | null>(null);
  const [showCard, setShowCard] = useState(false);
  const cardShowTimeoutRef = useRef<number | null>(null);
  const dismissTimeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (cardShowTimeoutRef.current) {
      window.clearTimeout(cardShowTimeoutRef.current);
      cardShowTimeoutRef.current = null;
    }
    if (dismissTimeoutRef.current) {
      window.clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const closeToast = useCallback(() => {
    if (!messageRef.current) return;
    clearTimers();
    setShowCard(false);

    dismissTimeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      messageRef.current = null;
      dismissTimeoutRef.current = null;
    }, 100);
  }, [clearTimers]);

  const handleIncomingMessage = useCallback(
    (payload: ToastPayload) => {
      const combinedOptions = payload.options;
      const effectiveReducedMotion = combinedOptions?.reducedMotion ?? reducedMotion;
      clearTimers();
      setShowCard(false);
      setMessage(payload.text);
      messageRef.current = payload.text;

      cardShowTimeoutRef.current = window.setTimeout(
        () => {
          setShowCard(true);
          cardShowTimeoutRef.current = null;
        },
        effectiveReducedMotion ? 50 : 300,
      );

      if (combinedOptions?.autoHide) {
        const duration = Math.max(0, combinedOptions.duration ?? 3000);
        dismissTimeoutRef.current = window.setTimeout(() => {
          closeToast();
        }, duration);
      }
    },
    [clearTimers, closeToast, reducedMotion],
  );

  const registerToastHandler = useCallback(
    () => bridge.register(handleIncomingMessage),
    [bridge, handleIncomingMessage],
  );

  useEffect(
    () => () => {
      clearTimers();
    },
    [clearTimers],
  );

  return {
    message,
    showCard,
    closeToast,
    registerToastHandler,
  };
}
