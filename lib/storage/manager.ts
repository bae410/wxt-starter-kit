import { produce } from 'immer';
import { browser } from 'wxt/browser';

import { StorageSchema, type StorageKey, type StorageValue } from './schema';

class StorageManager {
  async bootstrap(): Promise<void> {
    await this.ensureDefaults();
  }

  async migrate(previousVersion: string): Promise<void> {
    console.info('[storage] running migrations from version', previousVersion);
    await this.ensureDefaults();
    await this.migrateCrawlerQueue();
  }

  async ensureDefaults(): Promise<void> {
    await Promise.all(
      (Object.keys(StorageSchema) as StorageKey[]).map(async (key) => {
        const current = await this.get(key);
        if (current === undefined) {
          const schema = StorageSchema[key];
          const fallback = schema.parse(undefined);
          await this.set(key, fallback);
        }
      }),
    );
  }

  async get<K extends StorageKey>(key: K): Promise<StorageValue<K> | undefined> {
    const schema = StorageSchema[key];
    const result = await browser.storage.local.get(key);
    if (!(key in result)) return undefined;

    try {
      return schema.parse(result[key]) as StorageValue<K>;
    } catch (error) {
      console.warn(`[storage] failed to parse ${key}`, error);
      return schema.parse(undefined) as StorageValue<K>;
    }
  }

  async set<K extends StorageKey>(key: K, value: StorageValue<K>): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  async update<K extends StorageKey>(
    key: K,
    updater: (draft: StorageValue<K>) => void,
  ): Promise<StorageValue<K>> {
    const current =
      (await this.get(key)) ?? (StorageSchema[key].parse(undefined) as StorageValue<K>);
    const next = produce(current, updater);
    await this.set(key, next);
    return next;
  }

  async remove(key: StorageKey): Promise<void> {
    await browser.storage.local.remove(key);
  }

  private async migrateCrawlerQueue(): Promise<void> {
    const result = await browser.storage.local.get('crawler.queue');
    if (!('crawler.queue' in result)) return;

    const rawItems = result['crawler.queue'];
    if (!Array.isArray(rawItems)) return;

    const hasLegacyItems = rawItems.some((item) => isLegacyQueueItem(item));
    if (!hasLegacyItems) return;

    const upgraded = StorageSchema['crawler.queue'].parse(rawItems);
    await browser.storage.local.set({ 'crawler.queue': upgraded });
    console.info('[storage] migrated crawler queue to v2 schema');
  }
}

export const storageManager = new StorageManager();

function isLegacyQueueItem(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  if ('schemaVersion' in value) return false;
  const snapshot = (value as { snapshot?: unknown }).snapshot;
  if (typeof snapshot !== 'object' || snapshot === null) return false;
  return !('metadata' in snapshot) || !('content' in snapshot) || !('processing' in snapshot);
}
