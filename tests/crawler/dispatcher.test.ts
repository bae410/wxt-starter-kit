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
  schemaVersion: 3,
  metadata: {
    core: {
      url: 'https://example.com/article',
      capturedAt: Date.now(),
      source: 'readability',
      contentType: 'article',
      language: 'en',
      charset: null,
    },
    metaTags: {
      description: null,
      keywords: [],
      author: null,
      viewport: null,
      robots: null,
    },
    openGraph: {
      title: null,
      description: null,
      type: null,
      url: null,
      siteName: null,
      locale: null,
      images: [],
    },
    twitter: {
      card: null,
      site: null,
      creator: null,
      title: null,
      description: null,
      image: null,
    },
    structuredData: [],
    media: {
      images: [],
      videos: [],
      favicons: [],
      logo: null,
    },
    timings: {
      parseMs: null,
      metadataMs: null,
      totalMs: null,
    },
  },
  content: {
    title: 'Example Article',
    text: 'Hello world',
    sanitizedHtml: '<article><p>Hello world</p></article>',
    byline: null,
  },
  processing: {
    lang: 'en',
    redactions: [],
  },
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
