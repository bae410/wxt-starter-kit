import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addSnapshotAndFlush, flushCrawlQueue } from '@lib/crawler/dispatcher';
import { storageManager } from '@lib/storage/manager';
import type { CrawlQueueItem, CrawlSnapshot } from '@lib/storage/schema';

vi.mock('@lib/crawler/uploader', () => ({
  submitSnapshot: vi.fn(),
}));

const { submitSnapshot } = await import('@lib/crawler/uploader');
const submitSnapshotMock = vi.mocked(submitSnapshot);

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

let queueStore: CrawlQueueItem[];

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
      queueStore = clone(value as CrawlQueueItem[]);
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('flushCrawlQueue', () => {
  it('removes items after successful submission', async () => {
    submitSnapshotMock.mockResolvedValue({ ok: true });

    await addSnapshotAndFlush(baseSnapshot);
    await flushCrawlQueue();

    expect(queueStore).toHaveLength(0);
  });

  it('increments attempts and keeps item on retryable failure', async () => {
    submitSnapshotMock.mockResolvedValue({
      ok: false,
      retryable: true,
    });

    await addSnapshotAndFlush(baseSnapshot);
    await flushCrawlQueue();

    expect(queueStore).toHaveLength(1);
    expect(queueStore[0]?.attempts).toBe(1);
  });
});
