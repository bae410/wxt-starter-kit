import { Readability } from '@mozilla/readability';
import { describe, expect, it, vi } from 'vitest';

import { capturePageSnapshot, toCrawlSnapshot } from '@lib/crawler/readability';

function createDocument(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

describe('capturePageSnapshot', () => {
  it('creates a snapshot with metadata extracted from readability', () => {
    const document = createDocument(`
      <!doctype html>
      <html lang="en">
        <head>
          <title>Example Article</title>
        </head>
        <body>
          <article>
            <h1>Example Article</h1>
            <p>Contact us at writer@example.com for more details.</p>
          </article>
        </body>
      </html>
    `);

    const snapshot = capturePageSnapshot({ document, url: 'https://example.com/article' });

    expect(snapshot.source).toBe('readability');
    expect(snapshot.title).toBe('Example Article');
    expect(snapshot.sanitized.html).not.toContain('writer@example.com');
    expect(snapshot.sanitized.html).toContain('***@***.***');
    expect(snapshot.sanitized.redactions).toContainEqual({ type: 'email', count: 1 });
  });

  it('falls back to basic parser when readability fails', () => {
    const parseSpy = vi.spyOn(Readability.prototype, 'parse').mockReturnValueOnce(null as never);

    const document = createDocument(`
      <!doctype html>
      <html lang="en">
        <head>
          <title>Fallback Page</title>
        </head>
        <body>
          <main>
            <p>This content should be captured by the fallback parser.</p>
          </main>
        </body>
      </html>
    `);

    const snapshot = capturePageSnapshot({ document, url: 'https://example.com/fallback' });

    expect(snapshot.source).toBe('fallback');
    expect(snapshot.text).toContain('should be captured');

    parseSpy.mockRestore();
  });

  it('does not mutate the original document when readability runs', () => {
    const document = createDocument(`
      <!doctype html>
      <html lang="en">
        <head>
          <title>Unmutated Page</title>
        </head>
        <body>
          <article>
            <h1>Inline Content</h1>
            <p>Paragraph with <strong>markup</strong>.</p>
          </article>
        </body>
      </html>
    `);

    const originalMarkup = document.body?.innerHTML;

    capturePageSnapshot({ document, url: 'https://example.com/clone-check' });

    expect(document.body?.innerHTML).toBe(originalMarkup);
  });
});

describe('toCrawlSnapshot', () => {
  it('uses extractor to enrich metadata', async () => {
    const document = createDocument(`
      <!doctype html>
      <html lang="en">
        <head>
          <title>Example Article</title>
          <meta name="author" content="Reporter" />
          <meta name="keywords" content="news, example" />
          <link rel="icon" href="https://example.com/favicon.ico" />
        </head>
        <body>
          <article>
            <h1>Example Article</h1>
            <p>Contact us at writer@example.com for more details.</p>
          </article>
        </body>
      </html>
    `);

    const snapshot = capturePageSnapshot({ document, url: 'https://example.com/article' });
    const payload = await toCrawlSnapshot(snapshot);

    expect(payload.metadata.core.url).toBe('https://example.com/article');
    expect(payload.metadata.metaTags.author).toBe('Reporter');
    expect(payload.metadata.metaTags.keywords).toEqual(['news', 'example']);
    expect(payload.metadata.media.favicons[0]?.url).toBe('https://example.com/favicon.ico');
    expect(payload.metadata.core.language).toBe('en');
  });
});
