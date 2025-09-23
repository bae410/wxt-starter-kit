import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/sandbox';

import { addSnapshotAndFlush, flushCrawlQueue } from '@lib/crawler/dispatcher';
import { messageBus } from '@lib/messaging/bus';
import { analyticsService } from '@lib/services/analytics';
import { scheduleSyncJob } from '@lib/services/sync';
import { storageManager } from '@lib/storage/manager';

const CONTENT_SCRIPT_FILES = ['content-scripts/content.js'] as const;

const MESSAGE_ERRORS_WITHOUT_RECEIVER = [
  'Could not establish connection',
  'Receiving end does not exist',
  'The message port closed before a response was received',
];

function isMissingReceiverError(reason: unknown): boolean {
  if (!reason) return false;
  const message = reason instanceof Error ? reason.message : String(reason);
  return MESSAGE_ERRORS_WITHOUT_RECEIVER.some((snippet) => message.includes(snippet));
}

async function injectContentScript(target: { tabId: number; frameId?: number }): Promise<boolean> {
  try {
    await browser.scripting.executeScript({
      target:
        typeof target.frameId === 'number'
          ? { tabId: target.tabId, frameIds: [target.frameId] }
          : { tabId: target.tabId },
      files: [...CONTENT_SCRIPT_FILES],
    });
    return true;
  } catch (error) {
    console.warn('[wxt-starter] failed to inject content script', error);
    return false;
  }
}

async function deliverSelectionToTab(
  target: { tabId: number; frameId?: number },
  selectionText: string,
): Promise<boolean> {
  const message = {
    topic: 'context.selection' as const,
    payload: { text: selectionText },
  };

  const sendToTab = () =>
    typeof target.frameId === 'number'
      ? browser.tabs.sendMessage(target.tabId, message, { frameId: target.frameId })
      : browser.tabs.sendMessage(target.tabId, message);

  try {
    await sendToTab();
    return true;
  } catch (initialError) {
    if (!isMissingReceiverError(initialError)) {
      console.error('[wxt-starter] failed to deliver selection', initialError);
      return false;
    }

    const injected = await injectContentScript(target);
    if (!injected) {
      return false;
    }

    try {
      await sendToTab();
      return true;
    } catch (retryError) {
      console.error('[wxt-starter] selection delivery failed after reinjection', retryError);
      return false;
    }
  }
}

export default defineBackground({
  type: 'module',
  main() {
    console.info('[wxt-starter] service worker booted');

    browser.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        await storageManager.bootstrap();
        await analyticsService.track('extension_installed');
        await browser.tabs.create({
          url: browser.runtime.getURL('options/index.html#onboarding'),
        });
      }

      if (details.reason === 'update') {
        await storageManager.migrate(details.previousVersion ?? '0.0.0');
        await analyticsService.track('extension_updated', {
          from: details.previousVersion,
          to: browser.runtime.getManifest().version,
        });
      }
    });

    messageBus.register('settings:get', async () => {
      const preferences = await storageManager.get('user.preferences');
      return { preferences };
    });

    messageBus.register('settings:update', async ({ preferences }) => {
      await storageManager.set('user.preferences', preferences);
      await analyticsService.track('settings_updated');
      return { success: true } as const;
    });

    messageBus.register('settings.toggle', async ({ enabled }) => {
      await storageManager.set('extension.enabled', enabled);
      await analyticsService.track('extension_toggled', { enabled });
      return { enabled } as const;
    });

    messageBus.register('settings.sync', async () => {
      await analyticsService.track('settings_sync_requested');
      return { success: true } as const;
    });

    messageBus.register('stats.refresh', async () => {
      const state = await storageManager.get('extension.state');
      return {
        blocked: state?.blocked ?? 0,
        enhanced: state?.enhanced ?? 0,
      };
    });

    messageBus.register('options.open', async () => {
      await browser.runtime.openOptionsPage();
    });

    messageBus.register('activity.clear', async () => {
      await storageManager.set('activity.history', []);
      await analyticsService.track('activity_cleared');
    });

    messageBus.register('crawler.snapshot', async ({ snapshot }) => {
      const result = await addSnapshotAndFlush(snapshot);
      return {
        queued: result.status === 'queued',
        reason: result.reason,
      } as const;
    });

    messageBus.register('crawler.trigger', async ({ reason }) => {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        return { dispatched: false } as const;
      }

      try {
        await browser.tabs.sendMessage(activeTab.id, {
          topic: 'crawler.capture',
          payload: { reason: reason ?? 'manual' },
        });
        return { dispatched: true } as const;
      } catch (error) {
        console.warn('[crawler] failed to trigger capture', error);
        return { dispatched: false } as const;
      }
    });

    messageBus.register('devtools.evaluate', async ({ code }) => {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) {
        return { result: 'No active tab' } as const;
      }

      try {
        const [{ result }] = await browser.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: (snippet: string) => {
            try {
              // eslint-disable-next-line no-eval
              return String(eval(snippet));
            } catch (error) {
              return `Execution error: ${error}`;
            }
          },
          args: [code],
        });
        return { result: String(result ?? 'No output') } as const;
      } catch (error) {
        return { result: `Failed to execute: ${error}` } as const;
      }
    });

    messageBus.register('page.event', async (eventPayload) => {
      return { success: true, payload: eventPayload };
    });

    browser.runtime.onStartup.addListener(() => {
      void flushCrawlQueue();
    });

    void flushCrawlQueue();

    browser.contextMenus.create({
      id: 'wxt-starter-context',
      title: 'Send selection to WXT Starter',
      contexts: ['selection'],
    });

    browser.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId !== 'wxt-starter-context' || !tab?.id || !info.selectionText) {
        return;
      }

      const delivered = await deliverSelectionToTab(
        {
          tabId: tab.id,
          frameId: typeof info.frameId === 'number' ? info.frameId : undefined,
        },
        info.selectionText,
      );

      if (!delivered) {
        return;
      }

      const historyEntry = {
        timestamp: Date.now(),
        action: `Selection sent from ${tab.url ?? 'unknown page'}`,
      };

      await storageManager.update('activity.history', (draft) => {
        draft.unshift(historyEntry);
        if (draft.length > 50) draft.pop();
      });

      await browser.runtime.sendMessage({
        topic: 'activity.recorded',
        payload: historyEntry,
      });
    });

    scheduleSyncJob();
  },
});
