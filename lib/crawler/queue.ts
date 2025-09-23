import { storageManager } from '@lib/storage/manager';
import type { CrawlQueueItem, CrawlSnapshot } from '@lib/storage/schema';

const MAX_ITEMS = 5;
const MAX_BYTES = 250_000; // ~250 KB per requirements

export type EnqueueResultStatus = 'queued' | 'skipped';
export type EnqueueFailureReason = 'too_large' | 'queue_full' | 'storage_error';

export interface EnqueueResult {
  status: EnqueueResultStatus;
  reason?: EnqueueFailureReason;
  item?: CrawlQueueItem;
}

export async function enqueueSnapshot(snapshot: CrawlSnapshot): Promise<EnqueueResult> {
  try {
    const size = estimateSize(snapshot);
    if (size > MAX_BYTES) {
      return { status: 'skipped', reason: 'too_large' };
    }

    const queue = (await storageManager.get('crawler.queue')) ?? [];
    const nextItem: CrawlQueueItem = {
      id: generateQueueId(),
      createdAt: Date.now(),
      attempts: 0,
      snapshot,
    };

    const updated = [...queue, nextItem];

    if (updated.length > MAX_ITEMS) {
      // drop oldest items until we are within limit
      updated.splice(0, updated.length - MAX_ITEMS);
    }

    await storageManager.set('crawler.queue', updated);
    return { status: 'queued', item: nextItem };
  } catch (error) {
    console.warn('[crawler] failed to enqueue snapshot', error);
    return { status: 'skipped', reason: 'storage_error' };
  }
}

export async function getQueue(): Promise<CrawlQueueItem[]> {
  return (await storageManager.get('crawler.queue')) ?? [];
}

export async function setQueue(items: CrawlQueueItem[]): Promise<void> {
  await storageManager.set('crawler.queue', items);
}

export async function clearQueue(): Promise<void> {
  await setQueue([]);
}

function estimateSize(snapshot: CrawlSnapshot): number {
  const encoder = new TextEncoder();
  const json = JSON.stringify(snapshot);
  return encoder.encode(json).byteLength;
}

function generateQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `snapshot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
