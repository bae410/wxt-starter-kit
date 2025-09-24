import type { MockInstance } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  extractMetadata,
  getDefaultMetascraperRunner,
  type MetascraperRunner,
} from '@lib/crawler/metadata-extractor';
import { createBaseMetadata } from '@lib/storage/schema';

function createDocument(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

describe('metadata-extractor', () => {
  let warnSpy: MockInstance<
    Parameters<typeof console.warn>,
    ReturnType<typeof console.warn>
  > | null = null;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy?.mockRestore();
    warnSpy = null;
  });
  it('merges metascraper results with document metadata', async () => {
    const runner: MetascraperRunner = vi.fn(async () => ({
      description: 'Example Description',
      author: 'Example Author',
      image: 'https://example.com/image.jpg',
      logo: 'https://example.com/logo.png',
      lang: 'en',
    }));

    const document = createDocument(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta name="keywords" content="news, example" />
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body>
          <article>
            <h1>Example Article</h1>
          </article>
        </body>
      </html>
    `);

    const baseMetadata = createBaseMetadata({
      url: 'https://example.com/article',
      capturedAt: 1736448000000,
      source: 'readability',
      language: null,
      contentType: null,
    });

    const result = await extractMetadata({
      document,
      html: document.documentElement.outerHTML,
      url: 'https://example.com/article',
      baseMetadata,
      metascraperRunner: runner,
    });

    expect(result.metadata.core.url).toBe('https://example.com/article');
    expect(result.metadata.metaTags.description).toBe('Example Description');
    expect(result.metadata.metaTags.author).toBe('Example Author');
    expect(result.metadata.metaTags.keywords).toEqual(['news', 'example']);
    expect(result.metadata.media.images[0]?.url).toBe('https://example.com/image.jpg');
    expect(result.metadata.media.logo?.url).toBe('https://example.com/logo.png');
    expect(result.metadata.media.favicons).toHaveLength(1);
    expect(result.metadata.core.language).toBe('en');
    expect(typeof result.durationMs === 'number' || result.durationMs === null).toBe(true);
  });

  it('extracts open graph and twitter tags from the document when metascraper lacks them', async () => {
    const runner: MetascraperRunner = vi.fn(async () => ({}));

    const document = createDocument(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta property="og:title" content="네이버" />
          <meta property="og:description" content="네이버 메인에서 다양한 정보와 유용한 컨텐츠를 만나 보세요" />
          <meta property="og:url" content="https://www.naver.com/" />
          <meta property="og:image" content="https://s.pstatic.net/static/www/mobile/edit/2016/0705/mobile_212852414260.png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="네이버" />
          <meta property="og:locale" content="ko_KR" />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content="네이버" />
          <meta name="twitter:description" content="네이버 메인에서 다양한 정보와 유용한 컨텐츠를 만나 보세요" />
          <meta name="twitter:url" content="https://www.naver.com/" />
          <meta name="twitter:image" content="https://s.pstatic.net/static/www/mobile/edit/2016/0705/mobile_212852414260.png" />
        </head>
        <body></body>
      </html>
    `);

    const baseMetadata = createBaseMetadata({
      url: 'https://www.naver.com/',
      capturedAt: 1758691249363,
      source: 'readability',
      language: null,
      contentType: null,
    });

    const result = await extractMetadata({
      document,
      html: document.documentElement.outerHTML,
      url: 'https://www.naver.com/',
      baseMetadata,
      metascraperRunner: runner,
    });

    expect(result.metadata.openGraph.title).toBe('네이버');
    expect(result.metadata.openGraph.description).toBe(
      '네이버 메인에서 다양한 정보와 유용한 컨텐츠를 만나 보세요',
    );
    expect(result.metadata.openGraph.url).toBe('https://www.naver.com/');
    expect(result.metadata.openGraph.siteName).toBe('네이버');
    expect(result.metadata.openGraph.type).toBe('website');
    expect(result.metadata.openGraph.locale).toBe('ko_KR');
    expect(result.metadata.openGraph.images[0]).toMatchObject({
      url: 'https://s.pstatic.net/static/www/mobile/edit/2016/0705/mobile_212852414260.png',
      width: 1200,
      height: 630,
    });
    expect(result.metadata.twitter.card).toBe('summary');
    expect(result.metadata.twitter.title).toBe('네이버');
    expect(result.metadata.twitter.description).toBe(
      '네이버 메인에서 다양한 정보와 유용한 컨텐츠를 만나 보세요',
    );
    expect(result.metadata.twitter.image).toBe(
      'https://s.pstatic.net/static/www/mobile/edit/2016/0705/mobile_212852414260.png',
    );
  });

  it('falls back gracefully when metascraper throws', async () => {
    const runner: MetascraperRunner = vi.fn(async () => {
      throw new Error('boom');
    });

    const document = createDocument(`
      <!doctype html>
      <html>
        <head>
          <title>Fallback</title>
        </head>
        <body></body>
      </html>
    `);

    const baseMetadata = createBaseMetadata({
      url: 'https://example.com/article',
      capturedAt: 1736448000000,
      source: 'fallback',
      language: null,
      contentType: null,
    });

    const result = await extractMetadata({
      document,
      html: document.documentElement.outerHTML,
      url: 'https://example.com/article',
      baseMetadata,
      metascraperRunner: runner,
    });

    expect(result.metadata.metaTags.description).toBeNull();
    expect(result.metadata.media.images).toEqual([]);
    expect(typeof result.durationMs === 'number' || result.durationMs === null).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      '[metadata] metascraper execution failed',
      expect.any(Error),
    );
  });

  it('uses default runner when none is provided', async () => {
    const runner = getDefaultMetascraperRunner();
    const spy = vi.spyOn(runner, 'call');

    const document = createDocument(`
      <!doctype html>
      <html>
        <head>
          <title>Default Runner</title>
        </head>
        <body></body>
      </html>
    `);

    const baseMetadata = createBaseMetadata({
      url: 'https://example.com/default',
      capturedAt: 1736448000000,
      source: 'fallback',
      language: null,
      contentType: null,
    });

    await extractMetadata({
      document,
      html: document.documentElement.outerHTML,
      url: 'https://example.com/default',
      baseMetadata,
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
