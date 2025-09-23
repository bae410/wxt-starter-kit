import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enqueueSnapshot, getQueue } from '@lib/crawler/queue';
import { storageManager } from '@lib/storage/manager';
import type { CrawlSnapshot } from '@lib/storage/schema';

const baseSnapshot: CrawlSnapshot = {
  url: 'https://example.com/article',
  title: 'Example Article',
  capturedAt: Date.now(),
  source: 'readability',
  sanitizedHtml: '<article><p>Hello world</p></article>',
  text: 'Hello world',
  byline: null,
  lang: 'en',
  redactions: [],
};

let queueStore: unknown[];

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);

beforeEach(() => {
  queueStore = [];
  vi.spyOn(storageManager, 'get').mockImplementation(async (key) => {
    if (key === 'crawler.queue') {
      return clone(queueStore) as never;
    }
    return undefined as never;
  });
  vi.spyOn(storageManager, 'set').mockImplementation(async (key, value) => {
    if (key === 'crawler.queue') {
      queueStore = clone(value as unknown[]);
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enqueueSnapshot', () => {
  it('queues snapshots and enforces size limit', async () => {
    const result = await enqueueSnapshot(baseSnapshot);
    expect(result.status).toBe('queued');

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.snapshot.url).toBe(baseSnapshot.url);
  });

  it('rejects snapshots that exceed size threshold', async () => {
    const oversized: CrawlSnapshot = {
      ...baseSnapshot,
      sanitizedHtml: 'x'.repeat(260_000),
      text: 'x'.repeat(260_000),
    };

    const result = await enqueueSnapshot(oversized);
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('too_large');

    const queue = await getQueue();
    expect(queue).toHaveLength(0);
  });
});
