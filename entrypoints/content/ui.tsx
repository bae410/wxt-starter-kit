import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { Copy, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import type { ContentScriptContext } from 'wxt/client';
import { createShadowRootUi } from 'wxt/client';

import { Card, CardContent } from '@/components/ui/card';

interface UiController {
  updateSelection: (value: string) => void;
  flashMessage: (text: string) => void;
  destroy: () => void;
}

// Animation variants for enhanced motion design
const toastVariants = {
  initial: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -15,
    scale: 0.96,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 40,
      mass: 0.6,
    },
  },
};

const listItemVariants = {
  initial: {
    opacity: 0,
    x: -10,
  },
  animate: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
      delay: index * 0.08,
    },
  }),
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.01,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 17,
    },
  },
  tap: {
    scale: 0.97,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 20,
    },
  },
};

const dragVariants = {
  drag: {
    scale: 1.02,
    rotate: 2,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

const stackedCardVariants = {
  initial: {
    opacity: 0,
    y: -16,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 420,
      damping: 28,
      mass: 0.85,
    },
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: 0.95,
    transition: {
      type: 'spring' as const,
      stiffness: 360,
      damping: 26,
      mass: 0.8,
    },
  },
};

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
    const [showCard, setShowCard] = useState(false);
    const shouldReduceMotion = useReducedMotion();
    const stackControls = useAnimationControls();

    const cardShowTimeoutRef = useRef<number | null>(null);

    const closeToast = useCallback(() => {
      if (!message) return;
      pendingToast = null;

      // Clear any pending card show timeout
      if (cardShowTimeoutRef.current) {
        window.clearTimeout(cardShowTimeoutRef.current);
        cardShowTimeoutRef.current = null;
      }

      // Hide card first, then toast (Framer Motion will handle the timing)
      setShowCard(false);

      // Use a short delay to let the card animation start before hiding toast
      setTimeout(() => {
        setMessage(null);
      }, 100);
    }, [message]);

    // Gesture handling for drag-to-dismiss
    const handleDragEnd = useCallback(
      (
        event: MouseEvent | TouchEvent | PointerEvent,
        info: { velocity: { x: number; y: number }; offset: { x: number; y: number } },
      ) => {
        const { velocity, offset } = info;
        const threshold = 100;
        const velocityThreshold = 500;

        if (offset.y < -threshold || velocity.y < -velocityThreshold) {
          closeToast();
        }

        stackControls.start({
          y: 0,
          transition: shouldReduceMotion
            ? { duration: 0.15 }
            : {
                type: 'spring',
                stiffness: 520,
                damping: 36,
                mass: 0.6,
              },
        });
      },
      [closeToast, shouldReduceMotion, stackControls],
    );

    // Copy functionality for the copy button
    const handleCopy = useCallback(async () => {
      if (!message) return;

      try {
        await navigator.clipboard.writeText(message);
        // Could add a success animation or feedback here
      } catch (error) {
        console.warn('Failed to copy to clipboard:', error);
      }
    }, [message]);

    const clearTimers = useCallback(() => {
      if (cardShowTimeoutRef.current) {
        window.clearTimeout(cardShowTimeoutRef.current);
        cardShowTimeoutRef.current = null;
      }
    }, []);

    useEffect(() => {
      control.toast = (text: string) => {
        setShowCard(false);
        clearTimers();

        setMessage(text);
        pendingToast = null;

        // Show card after toast appears (adjusted for Framer Motion timing)
        cardShowTimeoutRef.current = window.setTimeout(
          () => {
            setShowCard(true);
            cardShowTimeoutRef.current = null;
          },
          shouldReduceMotion ? 50 : 300,
        );
      };

      // Handle any pending toast that was queued before component was ready
      if (pendingToast) {
        const queued = pendingToast;
        pendingToast = null;
        setShowCard(false);
        clearTimers();
        setMessage(queued);

        cardShowTimeoutRef.current = window.setTimeout(
          () => {
            setShowCard(true);
            cardShowTimeoutRef.current = null;
          },
          shouldReduceMotion ? 50 : 300,
        );
      }

      return () => {
        control.toast = (text: string) => {
          pendingToast = text;
        };
        clearTimers();
      };
    }, [clearTimers, shouldReduceMotion]);

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

    // Animation variants for reduced motion
    const getToastVariants = () => {
      if (shouldReduceMotion) {
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
      }
      return toastVariants;
    };

    return (
      <div className="toast-overlay">
        <AnimatePresence mode="sync">
          {message && (
            <motion.div
              key="toast-stack"
              layout
              drag={!shouldReduceMotion ? 'y' : false}
              dragListener
              dragMomentum={false}
              dragConstraints={{ top: -220, bottom: 80 }}
              dragElastic={0.25}
              whileDrag={!shouldReduceMotion ? dragVariants.drag : undefined}
              onDragStart={() => stackControls.stop()}
              onDragEnd={handleDragEnd}
              animate={stackControls}
              initial={{ y: 0 }}
              className="toast-stack flex cursor-default flex-col items-stretch"
              style={{ cursor: !shouldReduceMotion ? 'grab' : 'default' }}
            >
              <motion.div
                layout="position"
                layoutId="toast-shell"
                variants={getToastVariants()}
                initial="initial"
                animate="animate"
                exit="exit"
                className="toast-card group/toast relative flex h-12 items-center gap-3 px-5 sm:gap-4 sm:px-6"
              >
                <span className="toast-ambient" aria-hidden />

                <div className="relative z-10 flex h-full items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/60 text-slate-800 shadow-sm backdrop-blur-sm">
                      <Sparkles className="h-4 w-4" aria-hidden />
                    </div>
                    <span className="text-slate-400">Lumi</span>
                  </div>
                  <motion.p
                    className="flex-1 text-lg font-semibold leading-none tracking-tight text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    {message}
                  </motion.p>
                  <motion.button
                    type="button"
                    onClick={closeToast}
                    className="glass-button pointer-events-none inline-flex size-6 flex-shrink-0 items-center justify-center text-slate-500 shadow-sm opacity-0 transition-opacity duration-200 group-hover/toast:pointer-events-auto group-hover/toast:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label="Dismiss toast"
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </motion.button>
                </div>
              </motion.div>

              <AnimatePresence>
                {showCard && (
                  <motion.div
                    key="card"
                    layout
                    layoutId="idea-card"
                    {...(shouldReduceMotion
                      ? {
                          initial: { opacity: 0 },
                          animate: { opacity: 1 },
                          exit: { opacity: 0 },
                          transition: { duration: 0.18 },
                        }
                      : {
                          variants: stackedCardVariants,
                          initial: 'initial' as const,
                          animate: 'animate' as const,
                          exit: 'exit' as const,
                        })}
                    className="stacked-card z-0"
                  >
                    <Card className="overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-b from-white/92 via-white/80 to-white/65 text-slate-700 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-[28px]">
                      <CardContent className="relative z-20 px-5 py-5 sm:px-7 sm:py-6">
                        <div className="flex flex-col gap-5">
                          <motion.div
                            className="flex flex-col gap-3 text-xs font-medium normal-case tracking-normal text-slate-400 sm:flex-row sm:items-center sm:justify-between"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: 0.25,
                              type: 'spring',
                              stiffness: 300,
                              damping: 25,
                            }}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span>Double press</span>
                              <span className="rounded-full border border-white/70 bg-white/80 px-2 py-1 text-sm font-semibold normal-case tracking-tight text-slate-600 shadow-inner">
                                ⌘
                              </span>
                              <span>to paste anywhere</span>
                            </div>

                            <motion.button
                              type="button"
                              onClick={handleCopy}
                              className="glass-button inline-flex size-6 items-center justify-center text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                              aria-label="Copy suggestion"
                              variants={buttonVariants}
                              initial="initial"
                              whileHover="hover"
                              whileTap="tap"
                            >
                              <Copy className="h-4 w-4" aria-hidden />
                            </motion.button>
                          </motion.div>

                          <motion.div
                            className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-5"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: 0.35,
                              type: 'spring',
                              stiffness: 280,
                              damping: 24,
                            }}
                          >
                            <ul className="flex flex-col gap-3 text-sm leading-relaxed text-slate-700 sm:text-base">
                              {[
                                {
                                  text: 'Pickle Glass marketing strategy ideas',
                                  color: 'gradient-dot--pink',
                                },
                                {
                                  text: 'Hackathon for AI-glasses apps',
                                  color: 'gradient-dot--blue',
                                },
                                { text: 'Campus tour demos', color: 'gradient-dot--green' },
                                { text: 'Creator collab campaigns', color: 'gradient-dot--purple' },
                              ].map((item, index) => (
                                <motion.li
                                  key={index}
                                  className="flex items-center gap-3"
                                  variants={listItemVariants}
                                  initial="initial"
                                  animate="animate"
                                  custom={index}
                                >
                                  <span className={`gradient-dot ${item.color}`} />
                                  <span>{item.text}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
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
