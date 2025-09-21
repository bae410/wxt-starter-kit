import { Copy, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import type { ContentScriptContext } from 'wxt/client';
import { createShadowRootUi } from 'wxt/client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface UiController {
  updateSelection: (value: string) => void;
  flashMessage: (text: string) => void;
  destroy: () => void;
}

export async function createShadowRootUI(ctx: ContentScriptContext): Promise<UiController> {
  const mountNodes = new WeakMap<Root, HTMLElement>();
  let pendingToast: string | null = null;
  const control: {
    setSelection: (value: string) => void;
    toast: (text: string) => void;
  } = {
    setSelection: () => undefined,
    toast: (text: string) => {
      pendingToast = text;
    },
  };

  const App = () => {
    const [selection, setSelection] = useState('');

    useEffect(() => {
      control.setSelection = setSelection;
    }, []);

    return (
      <div className="wxt-starter shadow-panel">
        <header>
          <strong>WXT Starter Helper</strong>
          <span className="badge">Content Script</span>
        </header>
        <section>
          <h4>Current Selection</h4>
          <p className={selection ? '' : 'empty'}>{selection || 'No selection detected'}</p>
        </section>
      </div>
    );
  };

  const ToastLayer = ({ host }: { host: HTMLElement }) => {
    const [message, setMessage] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [showCard, setShowCard] = useState(false);
    const [cardClosing, setCardClosing] = useState(false);

    const toastHideTimeoutRef = useRef<number | null>(null);
    const cardShowTimeoutRef = useRef<number | null>(null);
    const cardHideTimeoutRef = useRef<number | null>(null);

    const clearTimers = useCallback(() => {
      if (toastHideTimeoutRef.current) {
        window.clearTimeout(toastHideTimeoutRef.current);
        toastHideTimeoutRef.current = null;
      }
      if (cardShowTimeoutRef.current) {
        window.clearTimeout(cardShowTimeoutRef.current);
        cardShowTimeoutRef.current = null;
      }
      if (cardHideTimeoutRef.current) {
        window.clearTimeout(cardHideTimeoutRef.current);
        cardHideTimeoutRef.current = null;
      }
    }, []);

    const startToastDismiss = useCallback(() => {
      if (isClosing) return;
      setIsClosing(true);
      if (toastHideTimeoutRef.current) {
        window.clearTimeout(toastHideTimeoutRef.current);
      }
      toastHideTimeoutRef.current = window.setTimeout(() => {
        setIsClosing(false);
        setMessage(null);
        toastHideTimeoutRef.current = null;
      }, 220);
    }, [isClosing]);

    const closeToast = useCallback(() => {
      if (!message) return;
      pendingToast = null;

      if (cardShowTimeoutRef.current) {
        window.clearTimeout(cardShowTimeoutRef.current);
        cardShowTimeoutRef.current = null;
        setShowCard(false);
      }

      if (showCard && !cardClosing) {
        setCardClosing(true);
        if (cardHideTimeoutRef.current) {
          window.clearTimeout(cardHideTimeoutRef.current);
        }
        cardHideTimeoutRef.current = window.setTimeout(() => {
          setShowCard(false);
          setCardClosing(false);
          cardHideTimeoutRef.current = null;
          startToastDismiss();
        }, 220);
        return;
      }

      if (cardHideTimeoutRef.current) {
        return;
      }

      startToastDismiss();
    }, [cardClosing, message, showCard, startToastDismiss]);

    useEffect(() => {
      control.toast = (text: string) => {
        setIsClosing(false);
        setCardClosing(false);
        setShowCard(false);
        clearTimers();

        setMessage(text);
        pendingToast = null;

        cardShowTimeoutRef.current = window.setTimeout(() => {
          setShowCard(true);
          cardShowTimeoutRef.current = null;
        }, 260);
      };

      if (pendingToast) {
        const queued = pendingToast;
        pendingToast = null;
        setIsClosing(false);
        setCardClosing(false);
        setShowCard(false);
        clearTimers();
        setMessage(queued);

        cardShowTimeoutRef.current = window.setTimeout(() => {
          setShowCard(true);
          cardShowTimeoutRef.current = null;
        }, 260);
      }

      return () => {
        control.toast = (text: string) => {
          pendingToast = text;
        };
        clearTimers();
      };
    }, [clearTimers]);

    useEffect(() => {
      if (!message) {
        return undefined;
      }

      const handlePointerDown = (event: PointerEvent) => {
        if (event.composedPath().includes(host)) {
          return;
        }
        closeToast();
      };

      window.addEventListener('pointerdown', handlePointerDown, true);
      return () => {
        window.removeEventListener('pointerdown', handlePointerDown, true);
      };
    }, [closeToast, host, message]);

    useEffect(
      () => () => {
        clearTimers();
      },
      [clearTimers],
    );

    if (!message) {
      return null;
    }

    return (
      <div className="toast-overlay">
        <div
          className="toast-card group relative flex min-h-[48px] items-center gap-4 pl-5 pr-12 py-3 sm:pl-6 sm:pr-14"
          data-dismiss={isClosing ? 'true' : 'false'}
        >
          <button
            type="button"
            onClick={closeToast}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-white/50 text-slate-500 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-150 hover:bg-white/70 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 group-hover:opacity-100"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/55 text-slate-800 shadow-sm backdrop-blur-sm">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <Badge
            variant="secondary"
            className="flex-shrink-0 border border-white/65 bg-white/55 px-3 py-1 text-sm font-semibold normal-case tracking-tight text-slate-700 shadow-sm backdrop-blur-sm"
          >
            Whisper
          </Badge>
          <p className="flex-1 text-lg font-semibold leading-none tracking-tight text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
            {message}
          </p>
        </div>

        <Card
          className="idea-card pointer-events-auto relative overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-b from-white/92 via-white/80 to-white/65 text-slate-700 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-[22px]"
          data-visible={showCard ? 'true' : 'false'}
          data-dismiss={cardClosing ? 'true' : 'false'}
        >
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-500 shadow-sm transition-colors duration-150 hover:bg-white/85 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Copy suggestion"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </button>
          <CardContent className="space-y-5 px-5 pb-6 pt-6 sm:px-7 sm:pb-7">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
              <span>Double press</span>
              <span className="rounded-full border border-white/70 bg-white/80 px-2 py-1 text-sm font-semibold normal-case tracking-tight text-slate-600 shadow-inner">
                ⌘
              </span>
              <span className="tracking-[0.28em]">to paste anywhere</span>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-r from-pink-400 via-rose-400 to-orange-300" />
                <span>Pickle Glass marketing strategy ideas</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400" />
                <span>Hackathon for AI-glasses apps</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-r from-emerald-400 via-lime-400 to-yellow-300" />
                <span>Campus tour demos</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-r from-violet-400 via-purple-400 to-pink-300" />
                <span>Creator collab campaigns</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const ui = await createShadowRootUi<Root>(ctx, {
    name: 'wxt-starter-panel',
    position: 'inline',
    mode: 'open',
    onMount: (container) => {
      const mountNode = document.createElement('div');
      container.append(mountNode);

      const root = createRoot(mountNode);
      mountNodes.set(root, mountNode);

      root.render(<App />);
      return root;
    },
    onRemove: (root) => {
      if (!root) return;

      root.unmount();
      mountNodes.get(root)?.remove();
      mountNodes.delete(root);
    },
  });

  ui.mount();

  const toastUi = await createShadowRootUi<Root>(ctx, {
    name: 'wxt-starter-toast',
    position: 'overlay',
    alignment: 'top-right',
    zIndex: 2147483647,
    onMount: (container, _shadow, shadowHost) => {
      const mountNode = document.createElement('div');
      container.append(mountNode);

      const root = createRoot(mountNode);
      mountNodes.set(root, mountNode);

      root.render(<ToastLayer host={shadowHost} />);
      return root;
    },
    onRemove: (root) => {
      if (!root) return;

      root.unmount();
      mountNodes.get(root)?.remove();
      mountNodes.delete(root);
    },
  });

  toastUi.mount();

  return {
    updateSelection: (value) => control.setSelection(value),
    flashMessage: (text) => control.toast(text),
    destroy: () => {
      ui.remove();
      toastUi.remove();
    },
  };
}
