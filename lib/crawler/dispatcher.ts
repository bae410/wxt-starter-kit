import { enqueueSnapshot, getQueue, setQueue } from '@lib/crawler/queue';
import type { CrawlSnapshot } from '@lib/storage/schema';

import { submitSnapshot } from './uploader';

const MAX_ATTEMPTS = 3;

export async function addSnapshotAndFlush(snapshot: CrawlSnapshot) {
  const result = await enqueueSnapshot(snapshot);
  if (result.status === 'queued') {
    void flushCrawlQueue();
  }
  return result;
}

export async function flushCrawlQueue(): Promise<{
  sent: number;
  pending: number;
}> {
  const queue = await getQueue();
  if (!queue.length) {
    return { sent: 0, pending: 0 };
  }

  let changed = false;
  let sent = 0;
  const updatedQueue = [...queue];

  for (const item of queue) {
    const result = await submitSnapshot(item);

    if (result.ok) {
      const index = updatedQueue.findIndex((entry) => entry.id === item.id);
      if (index >= 0) {
        updatedQueue.splice(index, 1);
        changed = true;
        sent += 1;
      }
      continue;
    }

    const index = updatedQueue.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      const attempts = (updatedQueue[index]?.attempts ?? 0) + 1;
      if (!result.retryable || attempts >= MAX_ATTEMPTS) {
        updatedQueue.splice(index, 1);
      } else {
        updatedQueue[index] = {
          ...updatedQueue[index]!,
          attempts,
        };
      }
      changed = true;
    }

    if (!result.retryable) {
      // Non-retryable failure – continue to next item instead of stopping the loop
      continue;
    }

    // Stop processing further items on retryable failure to avoid hammering server
    break;
  }

  if (changed) {
    await setQueue(updatedQueue);
  }

  return {
    sent,
    pending: updatedQueue.length,
  };
}
