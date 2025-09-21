import { defineContentScript } from 'wxt/sandbox';

import { messageBus } from '@lib/messaging/bus';

import { createShadowRootUI } from './ui';
import '@assets/styles/globals.css';
import './styles.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  main: async (ctx) => {
    console.info('[wxt-starter] content script injected on', window.location.href);

    const ui = await createShadowRootUI(ctx);

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
      ui.destroy();
    });
  },
});
