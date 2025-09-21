import { describe, it, expect, beforeEach, vi } from 'vitest';

import { storageManager } from '@lib/storage/manager';
import { StorageSchema } from '@lib/storage/schema';

describe('storageManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bootstrap seeds defaults', async () => {
    await storageManager.bootstrap();
    await Promise.all(
      (Object.keys(StorageSchema) as Array<keyof typeof StorageSchema>).map(async (key) => {
        const value = await storageManager.get(key);
        expect(value).toBeDefined();
      }),
    );
  });

  it('set and get maintain values', async () => {
    await storageManager.set('extension.enabled', true);
    expect(await storageManager.get('extension.enabled')).toBe(true);
  });
});
