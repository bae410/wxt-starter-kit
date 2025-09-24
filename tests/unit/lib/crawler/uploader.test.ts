import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CrawlQueueItem } from '@lib/storage/schema';

const requestMock = vi.fn();
const rawMock = vi.fn();

class MockHttpClientError extends Error {
  status?: number;
  response?: { status?: number };

  constructor(status?: number) {
    super('mock http error');
    this.name = 'MockHttpClientError';
    this.status = status;
    this.response = { status };
  }
}

const createHttpClientMock = vi
  .fn(() => Object.assign(requestMock, { raw: rawMock }))
  .mockName('createHttpClient');

vi.mock('@lib/api/http-client', () => ({
  createHttpClient: createHttpClientMock,
  HttpClientError: MockHttpClientError,
}));

describe('submitSnapshot', () => {
  const baseItem: CrawlQueueItem = {
    id: '1',
    createdAt: 0,
    attempts: 0,
    snapshot: {
      schemaVersion: 3,
      metadata: {
        core: {
          url: 'https://example.com/article',
          capturedAt: 1,
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
        title: 'Example',
        sanitizedHtml: '<html></html>',
        text: 'content',
        byline: null,
      },
      processing: {
        lang: 'en',
        redactions: [],
      },
    },
    schemaVersion: 3,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_API_BASE_URL', 'https://collector.test/v1');
    vi.unstubAllGlobals();
    vi.stubGlobal('CompressionStream', undefined);
    requestMock.mockReset();
    rawMock.mockReset();
    createHttpClientMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initialises crawler client with versioned base URL and forwards payload', async () => {
    rawMock.mockResolvedValue({ ok: true, status: 201 });
    const { submitSnapshot } = await import('@lib/crawler/uploader');

    const result = await submitSnapshot(baseItem);

    expect(createHttpClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://collector.test/v1', name: 'crawler' }),
    );
    expect(rawMock).toHaveBeenCalledTimes(1);
    expect(rawMock.mock.calls[0]?.[0]).toBe('/crawl/submit');

    const options = rawMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(typeof options?.body).toBe('string');
    expect(JSON.parse(options?.body as string).url).toBe(baseItem.snapshot.metadata.core.url);
    expect(result).toEqual({ ok: true, status: 201 });
  });

  it('marks 5xx errors as retryable', async () => {
    rawMock.mockRejectedValueOnce(new MockHttpClientError(503));
    const { submitSnapshot } = await import('@lib/crawler/uploader');

    const outcome = await submitSnapshot(baseItem);

    expect(outcome).toEqual({ ok: false, status: 503, retryable: true });
  });
});
