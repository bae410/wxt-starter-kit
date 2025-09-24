import { Readability } from '@mozilla/readability';

import { sanitizeHtmlContent, type SanitizedHtml } from '@lib/privacy/sanitizer';
import { createBaseMetadata, type CrawlSnapshot } from '@lib/storage/schema';

import { extractMetadata } from './metadata-extractor';

export interface PageSnapshot {
  url: string;
  title: string;
  html: string;
  text: string;
  byline?: string | null;
  lang?: string | null;
  length?: number;
  sanitized: SanitizedHtml;
  capturedAt: number;
  source: 'readability' | 'fallback';
}

interface SnapshotOptions {
  document: Document;
  url: string;
  capturedAt?: number;
}

export function capturePageSnapshot({
  document,
  url,
  capturedAt = Date.now(),
}: SnapshotOptions): PageSnapshot {
  const readabilityResult = runReadability(document);
  const fallbackResult = readabilityResult ?? runFallback(document);

  const documentHtml = document.documentElement.outerHTML;

  const sanitized = sanitizeHtmlContent(fallbackResult.html);

  return {
    url,
    title: selectValue([readabilityResult?.title, document.title, url]),
    html: documentHtml,
    text: fallbackResult.text,
    byline: readabilityResult?.byline ?? null,
    lang: readabilityResult?.lang ?? document.documentElement.lang ?? null,
    length: readabilityResult?.length ?? fallbackResult.text.length,
    sanitized,
    capturedAt,
    source: readabilityResult ? 'readability' : 'fallback',
  };
}

export async function toCrawlSnapshot(
  snapshot: PageSnapshot,
  sourceDocument?: Document,
): Promise<CrawlSnapshot> {
  const baseMetadata = createBaseMetadata({
    url: snapshot.url,
    capturedAt: snapshot.capturedAt,
    source: snapshot.source,
    language: snapshot.lang ?? null,
    contentType: snapshot.length ? 'article' : 'webpage',
  });

  const documentForMetadata = sourceDocument ?? documentFromHtml(snapshot.html);

  const { metadata, durationMs } = await extractMetadata({
    document: documentForMetadata,
    html: documentForMetadata.documentElement.outerHTML,
    url: snapshot.url,
    baseMetadata,
  });

  metadata.metaTags.author = metadata.metaTags.author ?? snapshot.byline ?? null;
  metadata.timings.metadataMs = durationMs ?? metadata.timings.metadataMs;

  return {
    schemaVersion: 3,
    metadata,
    content: {
      title: snapshot.title,
      text: snapshot.text,
      sanitizedHtml: snapshot.sanitized.html,
      byline: snapshot.byline ?? null,
    },
    processing: {
      lang: snapshot.lang ?? null,
      redactions: snapshot.sanitized.redactions,
    },
  };
}

function documentFromHtml(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function runReadability(doc: Document) {
  try {
    const cloned = doc.cloneNode(true) as Document; // Prevent Readability from mutating the live DOM
    const reader = new Readability(cloned);
    const article = reader.parse();
    if (!article) return null;

    const contentHtml = article.content?.trim();
    const contentText = article.textContent?.trim();

    if (!contentHtml || !contentText) {
      return null;
    }

    return {
      title: article.title ?? undefined,
      html: contentHtml,
      text: contentText,
      byline: article.byline ?? undefined,
      lang: article.lang ?? undefined,
      length: article.length ?? undefined,
    };
  } catch (error) {
    console.warn('[crawler] readability failed, falling back', error);
    return null;
  }
}

function runFallback(doc: Document) {
  const clone = doc.cloneNode(true) as Document;
  stripUnwantedNodes(clone);

  const main = clone.querySelector('main, article, [role="main"]');
  const target = main ?? clone.body;

  const html = target?.innerHTML?.trim() ?? '';
  const text = target?.textContent?.trim() ?? '';

  return {
    html,
    text,
  };
}

function stripUnwantedNodes(doc: Document) {
  const selectors = ['script', 'style', 'noscript', 'iframe', 'object', 'embed'];
  doc.querySelectorAll(selectors.join(',')).forEach((node) => node.remove());
}

function selectValue(values: Array<string | undefined | null>): string {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) ?? '';
}
