import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';

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

describe('storage migrations', () => {
  beforeEach(async () => {
    const current = await browser.storage.local.get();
    await Promise.all(Object.keys(current).map((key) => browser.storage.local.remove(key)));
  });

  it('upgrades legacy crawler queue entries to schema v2', async () => {
    const legacySnapshot = {
      url: 'https://legacy.example.test',
      title: 'Legacy Entry',
      capturedAt: 123,
      source: 'readability' as const,
      sanitizedHtml: '<p>legacy</p>',
      text: 'legacy',
      byline: 'Reporter',
      lang: 'en',
      redactions: [{ type: 'email' as const, count: 1 }],
    };

    const legacyQueue = [
      {
        id: 'legacy-1',
        createdAt: 123,
        attempts: 1,
        snapshot: legacySnapshot,
      },
    ];

    await browser.storage.local.set({ 'crawler.queue': legacyQueue });

    await storageManager.migrate('1.0.0');

    const migratedRaw = (await browser.storage.local.get('crawler.queue')) as {
      'crawler.queue'?: unknown;
    };
    const migratedItems = migratedRaw['crawler.queue'];
    expect(Array.isArray(migratedItems)).toBe(true);
    if (!Array.isArray(migratedItems)) {
      throw new Error('Expected crawler queue to be an array after migration');
    }
    const migrated = migratedItems[0];
    expect(migrated?.schemaVersion).toBe(3);
    expect(migrated?.snapshot?.schemaVersion).toBe(3);
    expect(migrated?.snapshot?.metadata?.core.url).toBe(legacySnapshot.url);

    const parsed = await storageManager.get('crawler.queue');
    expect(parsed?.[0]?.snapshot.metadata.core.url).toBe(legacySnapshot.url);
    expect(parsed?.[0]?.snapshot.content.byline).toBe(legacySnapshot.byline);
    expect(parsed?.[0]?.snapshot.processing.lang).toBe(legacySnapshot.lang);
  });
});
