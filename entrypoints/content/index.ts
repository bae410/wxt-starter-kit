import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/sandbox';

import { capturePageSnapshot, toCrawlSnapshot } from '@lib/crawler/readability';
import { messageBus } from '@lib/messaging/bus';

import '@assets/styles/globals.css';
import './styles.css';
import { createShadowRootUI, type ContentUiController } from './ui';

const WELCOME_TOAST_DELAY_MS = 2000;
const WELCOME_TOAST_MESSAGE = 'WXT Starter is ready on this page.';
const CRAWL_DEBOUNCE_MS = 3000;

type CrawlReason = 'initial' | 'manual' | 'retry';

let activeWelcomeTimer: ReturnType<typeof setTimeout> | null = null;
let activeWelcomeController: ContentUiController | null = null;
let beforeUnloadHandler: (() => void) | null = null;
let crawlTimer: ReturnType<typeof setTimeout> | null = null;

const clearCrawlTimer = () => {
  if (crawlTimer) {
    clearTimeout(crawlTimer);
    crawlTimer = null;
  }
};

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
    clearCrawlTimer();
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

    activeWelcomeTimer = setTimeout(() => {
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

    const unsubscribeCrawl = messageBus.subscribe('crawler.capture', ({ payload }) => {
      scheduleCrawl(payload?.reason ?? 'manual');
    });

    await scheduleInitialCrawl();

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
      unsubscribeCrawl();
      teardownWelcomeToast();
      clearCrawlTimer();
      ui.destroy();
    });
  },
});

async function isExtensionEnabled(): Promise<boolean> {
  try {
    const result = await browser.storage.local.get('extension.enabled');
    if (typeof result['extension.enabled'] === 'boolean') {
      return result['extension.enabled'];
    }
  } catch (error) {
    console.warn('[crawler] unable to read extension.enabled flag', error);
  }
  return false;
}

async function scheduleInitialCrawl(): Promise<void> {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    scheduleCrawl('initial');
    return;
  }

  window.addEventListener(
    'DOMContentLoaded',
    () => {
      scheduleCrawl('initial');
    },
    { once: true },
  );
}

function scheduleCrawl(reason: CrawlReason): void {
  clearCrawlTimer();
  const delay = reason === 'manual' ? 0 : CRAWL_DEBOUNCE_MS;
  crawlTimer = setTimeout(() => {
    void performCrawl(reason);
  }, delay);
}

async function performCrawl(reason: CrawlReason): Promise<void> {
  crawlTimer = null;
  const enabled = await isExtensionEnabled();
  if (!enabled) {
    console.info('[crawler] skipping crawl: extension disabled');
    return;
  }

  const snapshot = capturePageSnapshot({ document, url: window.location.href });
  const payload = await toCrawlSnapshot(snapshot);

  try {
    const response = await messageBus.emit('crawler.snapshot', { snapshot: payload });

    console.info('[crawler] snapshot captured', {
      reason,
      source: snapshot.source,
      url: snapshot.url,
      title: snapshot.title,
      redactions: snapshot.sanitized.redactions,
      queued: response?.queued ?? false,
      queueReason: response?.reason,
    });
  } catch (error) {
    console.warn('[crawler] failed to queue snapshot', error);
  }
}
