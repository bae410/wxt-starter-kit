import { defineContentScript } from 'wxt/sandbox';

import { messageBus } from '@lib/messaging/bus';

import '@assets/styles/globals.css';
import './styles.css';
import { createShadowRootUI, type ContentUiController } from './ui';

const WELCOME_TOAST_DELAY_MS = 2000;
const WELCOME_TOAST_MESSAGE = 'WXT Starter is ready on this page.';

let activeWelcomeTimer: ReturnType<typeof window.setTimeout> | null = null;
let activeWelcomeController: ContentUiController | null = null;
let beforeUnloadHandler: (() => void) | null = null;

const clearActiveWelcomeTimer = () => {
  if (activeWelcomeTimer !== null) {
    window.clearTimeout(activeWelcomeTimer);
    activeWelcomeTimer = null;
  }
};

const removeBeforeUnloadListener = () => {
  if (!beforeUnloadHandler) return;
  window.removeEventListener('beforeunload', beforeUnloadHandler);
  beforeUnloadHandler = null;
};

const ensureBeforeUnloadListener = () => {
  if (beforeUnloadHandler) return;
  beforeUnloadHandler = () => {
    clearActiveWelcomeTimer();
    activeWelcomeController = null;
    removeBeforeUnloadListener();
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);
};

function scheduleWelcomeToast(ui: ContentUiController): () => void {
  const startTimer = () => {
    if (activeWelcomeTimer !== null && activeWelcomeController !== ui) {
      return;
    }

    if (!activeWelcomeController) {
      activeWelcomeController = ui;
    }

    if (activeWelcomeTimer !== null) {
      return;
    }

    activeWelcomeTimer = window.setTimeout(() => {
      activeWelcomeController?.flashMessage(WELCOME_TOAST_MESSAGE);
      clearActiveWelcomeTimer();
      activeWelcomeController = null;
      removeBeforeUnloadListener();
    }, WELCOME_TOAST_DELAY_MS);
  };

  if (document.readyState === 'complete') {
    startTimer();
  } else {
    window.addEventListener('load', startTimer, { once: true });
  }

  ensureBeforeUnloadListener();

  return () => {
    window.removeEventListener('load', startTimer);

    if (activeWelcomeController === ui) {
      clearActiveWelcomeTimer();
      activeWelcomeController = null;
    }

    if (!activeWelcomeController) {
      removeBeforeUnloadListener();
    }
  };
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  main: async (ctx) => {
    const ui = await createShadowRootUI(ctx);

    const teardownWelcomeToast = scheduleWelcomeToast(ui);

    const onSelectionChange = () => {
      const selection = window.getSelection()?.toString() ?? '';
      ui.updateSelection(selection);
    };

    document.addEventListener('selectionchange', onSelectionChange);

    const unsubscribeBus = messageBus.subscribe('context.selection', ({ payload }) => {
      ui.flashMessage(`Selection received: ${payload.text}`);
    });

    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data?.type) return;

      if (event.data.type === 'FROM_PAGE') {
        void messageBus.emit('page.event', { payload: event.data.payload });
      }
    });

    ctx.onInvalidated(() => {
      document.removeEventListener('selectionchange', onSelectionChange);
      unsubscribeBus();
      teardownWelcomeToast();
      ui.destroy();
    });
  },
});
