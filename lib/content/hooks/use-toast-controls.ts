import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastBridge {
  enqueue: (message: string) => void;
  register: (handler: (message: string) => void) => () => void;
}

export function createToastBridge(): ToastBridge {
  let pending: string | null = null;
  let activeHandler: ((message: string) => void) | null = null;

  return {
    enqueue: (message: string) => {
      if (activeHandler) {
        activeHandler(message);
      } else {
        pending = message;
      }
    },
    register: (handler: (message: string) => void) => {
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
    if (!message) return;
    clearTimers();
    setShowCard(false);

    dismissTimeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      dismissTimeoutRef.current = null;
    }, 100);
  }, [clearTimers, message]);

  const handleIncomingMessage = useCallback(
    (text: string) => {
      clearTimers();
      setShowCard(false);
      setMessage(text);

      cardShowTimeoutRef.current = window.setTimeout(
        () => {
          setShowCard(true);
          cardShowTimeoutRef.current = null;
        },
        reducedMotion ? 50 : 300,
      );
    },
    [clearTimers, reducedMotion],
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
