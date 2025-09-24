import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enqueueSnapshot, getQueue } from '@lib/crawler/queue';
import { storageManager } from '@lib/storage/manager';
import type { CrawlSnapshot } from '@lib/storage/schema';

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
    expect(queue[0]?.snapshot.metadata.core.url).toBe(baseSnapshot.metadata.core.url);
  });

  it('rejects snapshots that exceed size threshold', async () => {
    const oversized: CrawlSnapshot = {
      ...baseSnapshot,
      content: {
        ...baseSnapshot.content,
        sanitizedHtml: 'x'.repeat(260_000),
        text: 'x'.repeat(260_000),
      },
    };

    const result = await enqueueSnapshot(oversized);
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('too_large');

    const queue = await getQueue();
    expect(queue).toHaveLength(0);
  });
});
