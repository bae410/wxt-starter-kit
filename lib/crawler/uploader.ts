import { FetchError, ofetch } from 'ofetch';

import type { CrawlQueueItem, CrawlSnapshot } from '@lib/storage/schema';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.example.com/v1';
const SUBMIT_PATH = '/crawl/submit';

const api = ofetch.create({
  baseURL: BASE_URL,
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
  source: CrawlSnapshot['source'];
  content: {
    html: string;
    text: string;
  };
  metadata: {
    byline?: string | null;
    lang?: string | null;
    redactions: CrawlSnapshot['redactions'];
  };
}

export async function submitSnapshot(item: CrawlQueueItem): Promise<SubmitResult> {
  const payload: SubmitPayload = {
    url: item.snapshot.url,
    title: item.snapshot.title,
    capturedAt: item.snapshot.capturedAt,
    source: item.snapshot.source,
    content: {
      html: item.snapshot.sanitizedHtml,
      text: item.snapshot.text,
    },
    metadata: {
      byline: item.snapshot.byline ?? null,
      lang: item.snapshot.lang ?? null,
      redactions: item.snapshot.redactions,
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
    if (error instanceof FetchError) {
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
