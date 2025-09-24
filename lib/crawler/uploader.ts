import { FetchError } from 'ofetch';

import { createHttpClient, HttpClientError } from '@lib/api/http-client';
import type { CrawlQueueItem, CrawlSnapshot } from '@lib/storage/schema';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.example.com/v1';
const SUBMIT_PATH = '/crawl/submit';

const api = createHttpClient({
  baseURL: BASE_URL,
  name: 'crawler',
});

export interface SubmitResult {
  ok: boolean;
  status?: number;
  retryable?: boolean;
}

interface SubmitPayload {
  url: string;
  title: string;
  capturedAt: number;
  source: CrawlSnapshot['metadata']['core']['source'];
  content: {
    html: string;
    text: string;
  };
  metadata: {
    byline: string | null;
    lang: string | null;
    redactions: CrawlSnapshot['processing']['redactions'];
  };
}

export async function submitSnapshot(item: CrawlQueueItem): Promise<SubmitResult> {
  const { metadata, content, processing } = item.snapshot;

  const payload: SubmitPayload = {
    url: metadata.core.url,
    title: content.title,
    capturedAt: metadata.core.capturedAt,
    source: metadata.core.source,
    content: {
      html: content.sanitizedHtml,
      text: content.text,
    },
    metadata: {
      byline: content.byline,
      lang: processing.lang,
      redactions: processing.redactions,
    },
  };

  const { body, headers } = await encodePayload(payload);

  try {
    const response = await api.raw(SUBMIT_PATH, {
      method: 'POST',
      body: body as BodyInit,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    return { ok: response.ok, status: response.status };
  } catch (error: unknown) {
    if (error instanceof HttpClientError || error instanceof FetchError) {
      const status = getStatusFromError(error);
      return {
        ok: false,
        status,
        retryable: isRetryableStatus(status),
      };
    }

    return { ok: false, retryable: true };
  }
}

function isRetryableStatus(status?: number): boolean {
  if (!status) return true;
  return [408, 429, 500, 502, 503, 504].includes(status);
}

interface ErrorWithResponse {
  response?: { status?: number } | null;
}

function hasResponse(error: unknown): error is ErrorWithResponse {
  return typeof error === 'object' && error !== null && 'response' in error;
}

function getStatusFromError(error: unknown): number | undefined {
  if (typeof (error as { status?: number })?.status === 'number') {
    return (error as { status?: number }).status;
  }

  if (hasResponse(error)) {
    const { status } = error.response ?? {};
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

async function encodePayload(payload: SubmitPayload): Promise<{
  body: BodyInit;
  headers: Record<string, string>;
}> {
  const json = JSON.stringify(payload);

  if (typeof CompressionStream === 'function') {
    try {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const chunk = new TextEncoder().encode(json);
      await writer.write(chunk);
      await writer.close();

      const compressed = await new Response(stream.readable).arrayBuffer();
      return {
        body: compressed,
        headers: {
          'Content-Encoding': 'gzip',
        },
      };
    } catch (error) {
      console.warn('[crawler] compression failed, sending raw payload', error);
    }
  }

  return {
    body: json,
    headers: {},
  };
}
