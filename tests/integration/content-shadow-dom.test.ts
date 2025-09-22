import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from 'wxt/client';

import {
  createShadowRootUiMock,
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
  createShadowRootUiMock.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('content UI shadow roots', () => {
  it('initializes panel and toast shadow roots with expected configuration', async () => {
    const ctx = {} as ContentScriptContext;

    await createShadowRootUI(ctx);

    const calls = createShadowRootUiMock.mock.calls;
    expect(calls).toHaveLength(2);

    const names = calls.map(([, options]) => options.name);
    expect(names).toEqual(['wxt-starter-panel', 'wxt-starter-toast']);

    const toastOptions = calls[1][1];
    expect(toastOptions.position).toBe('overlay');
    expect(toastOptions.alignment).toBe('top-right');
  });

  it('tears down both shadow roots on destroy', async () => {
    const ctx = {} as ContentScriptContext;

    const controller = await createShadowRootUI(ctx);

    await vi.runAllTimersAsync();

    expect(shadowHosts.get('wxt-starter-panel')).toBeTruthy();
    expect(shadowHosts.get('wxt-starter-toast')).toBeTruthy();

    controller.destroy();

    expect(shadowHosts.size).toBe(0);
    expect(shadowUiInstances.size).toBe(0);
  });
});
