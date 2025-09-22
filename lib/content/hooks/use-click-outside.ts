import { useEffect } from 'react';

interface UseClickOutsideOptions {
  host: HTMLElement | null;
  active: boolean;
  onOutsideClick: () => void;
  capture?: boolean;
  eventName?: keyof DocumentEventMap;
}

export function useClickOutside({
  host,
  active,
  onOutsideClick,
  capture = true,
  eventName = 'pointerdown',
}: UseClickOutsideOptions): void {
  useEffect(() => {
    if (!active || !host) {
      return;
    }

    const handleEvent = (event: Event) => {
      const path = (event.composedPath?.() ?? []) as EventTarget[];
      if (path.includes(host)) {
        return;
      }
      onOutsideClick();
    };

    window.addEventListener(eventName, handleEvent, capture);
    return () => {
      window.removeEventListener(eventName, handleEvent, capture);
    };
  }, [active, capture, eventName, host, onOutsideClick]);
}
