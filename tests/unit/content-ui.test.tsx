import { act, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from 'wxt/client';

import {
  registerContentUiMocks,
  shadowHosts,
  shadowUiInstances,
} from '@tests/helpers/mock-content-ui';

registerContentUiMocks();

let createShadowRootUI: typeof import('@entry/content/ui').createShadowRootUI;

beforeAll(async () => {
  ({ createShadowRootUI } = await import('@entry/content/ui'));
});

beforeEach(() => {
  document.body.innerHTML = '';
  shadowHosts.clear();
  shadowUiInstances.clear();
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn(),
    },
    configurable: true,
  });
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createShadowRootUI', () => {
  it('queues toast messages until toast root is ready', async () => {
    const ctx = {} as ContentScriptContext;

    let controller!: Awaited<ReturnType<typeof createShadowRootUI>>;
    await act(async () => {
      controller = await createShadowRootUI(ctx);
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      controller.flashMessage('Queued message');
      await vi.runAllTimersAsync();
    });

    const toastNode = screen.getByText('Queued message');
    expect(toastNode).toBeTruthy();
  });

  it('keeps toast visible until dismissed when enqueued before toast root mounts', async () => {
    const ctx = {} as ContentScriptContext;

    let controller!: Awaited<ReturnType<typeof createShadowRootUI>>;
    await act(async () => {
      controller = await createShadowRootUI(ctx);
    });

    await act(async () => {
      controller.flashMessage('Persistent toast');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByText('Persistent toast')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText('Persistent toast')).toBeTruthy();

    const dismissButton = screen.getByRole('button', { name: 'Dismiss toast' });

    await act(async () => {
      dismissButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByText('Persistent toast')).toBeNull();
  });

  it('applies auto hide duration when provided through flashMessage options', async () => {
    const ctx = {} as ContentScriptContext;

    let controller!: Awaited<ReturnType<typeof createShadowRootUI>>;
    await act(async () => {
      controller = await createShadowRootUI(ctx);
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      controller.flashMessage('Timed toast', { autoHide: true, duration: 1500 });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(screen.getByText('Timed toast')).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
      await vi.runAllTimersAsync();
    });

    expect(screen.queryByText('Timed toast')).toBeNull();
  });

  it('updates selection text via controller bridge', async () => {
    const ctx = {} as ContentScriptContext;

    let controller!: Awaited<ReturnType<typeof createShadowRootUI>>;
    await act(async () => {
      controller = await createShadowRootUI(ctx);
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      controller.updateSelection('Hello world');
      await vi.runAllTimersAsync();
    });

    const panelHost = shadowHosts.get('wxt-starter-panel');
    expect(panelHost).toBeTruthy();
    const displayed = panelHost?.querySelector('p');
    expect(displayed?.textContent).toContain('Hello world');
  });

  it('cleans up shadow hosts on destroy', async () => {
    const ctx = {} as ContentScriptContext;

    let controller!: Awaited<ReturnType<typeof createShadowRootUI>>;
    await act(async () => {
      controller = await createShadowRootUI(ctx);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      controller.destroy();
    });

    expect(shadowHosts.size).toBe(0);
  });
});
