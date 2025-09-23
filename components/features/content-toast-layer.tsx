import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { Copy, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect } from 'react';

import { Card, CardContent } from '@components/ui/card';

import {
  buttonVariants,
  dragVariants,
  listItemVariants,
  stackedCardVariants,
  toastVariants,
} from '@lib/content/animation-variants';
import { useClickOutside } from '@lib/content/hooks/use-click-outside';
import { useToastControls, type ToastBridge } from '@lib/content/hooks/use-toast-controls';
import { IDEA_SUGGESTIONS, TOAST_SOURCE_LABEL } from '@lib/content/visual-constants';

interface ContentToastLayerProps {
  host: HTMLElement;
  bridge: ToastBridge;
}

export function ContentToastLayer({ host, bridge }: ContentToastLayerProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const stackControls = useAnimationControls();
  const { closeToast, message, registerToastHandler, showCard } = useToastControls({
    bridge,
    reducedMotion: shouldReduceMotion,
  });

  useEffect(() => {
    const unregister = registerToastHandler();
    return () => {
      unregister();
    };
  }, [registerToastHandler]);

  useClickOutside({
    host,
    active: Boolean(message),
    onOutsideClick: closeToast,
  });

  const handleDragEnd = useCallback(
    (
      _event: MouseEvent | TouchEvent | PointerEvent,
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

  const handleCopy = useCallback(async () => {
    if (!message) return;

    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Clipboard API not available or permission denied
    }
  }, [message]);

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
            variants={dragVariants}
            whileDrag={!shouldReduceMotion ? 'drag' : undefined}
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
              className="toast-card group/toast relative flex min-h-12 items-center gap-3 py-3 px-5 sm:gap-4"
            >
              <span className="toast-ambient" aria-hidden />

              <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/60 text-slate-800 shadow-sm backdrop-blur-sm">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </div>
                  <span className="text-slate-400">{TOAST_SOURCE_LABEL}</span>
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold leading-snug tracking-tight text-slate-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] break-words line-clamp-2">
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      {message}
                    </motion.span>
                  </div>
                </div>
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
                            {IDEA_SUGGESTIONS.map((item, index) => (
                              <motion.li
                                key={item.text}
                                className="flex items-center gap-3"
                                variants={listItemVariants}
                                initial="initial"
                                animate="animate"
                                custom={index}
                              >
                                <span className={`gradient-dot ${item.colorClass}`} />
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
}
