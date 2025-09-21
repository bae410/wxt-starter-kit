import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from 'wxt/browser';

import { messageBus } from '@lib/messaging/bus';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('messageBus', () => {
  it('invokes registered handler and returns response', async () => {
    // Mock the runtime.sendMessage to return the expected response format
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({
      ok: true,
      payload: { success: true },
    });

    messageBus.register('settings.sync', async () => ({ success: true }));

    const response = await messageBus.emit('settings.sync');

    expect(response).toEqual({ success: true });
  });
});
