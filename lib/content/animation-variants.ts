import type { Variants } from 'framer-motion';

export const toastVariants: Variants = {
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
      type: 'spring',
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
      type: 'spring',
      stiffness: 400,
      damping: 40,
      mass: 0.6,
    },
  },
};

export const listItemVariants = {
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

export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.01,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 17,
    },
  },
  tap: {
    scale: 0.97,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
    },
  },
};

export const dragVariants: Variants = {
  drag: {
    scale: 1.02,
    rotate: 2,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
    },
  },
};

export const stackedCardVariants: Variants = {
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
      type: 'spring',
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
      type: 'spring',
      stiffness: 360,
      damping: 26,
      mass: 0.8,
    },
  },
};
