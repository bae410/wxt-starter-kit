import { useCallback, useEffect, useMemo, useState } from 'react';

import { storageManager } from '@lib/storage/manager';
import type { StorageKey, StorageValue } from '@lib/storage/schema';

interface UseStorageResult<K extends StorageKey> {
  value: StorageValue<K> | undefined;
  loading: boolean;
  error: Error | null;
  setValue: (value: StorageValue<K>) => Promise<void>;
  updateValue: (updater: (draft: StorageValue<K>) => void) => Promise<void>;
  remove: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStorage<K extends StorageKey>(
  key: K,
  fallback?: StorageValue<K>,
): UseStorageResult<K> {
  const [value, setValueState] = useState<StorageValue<K> | undefined>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stored = await storageManager.get(key);
      setValueState(stored ?? fallback);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setValueState(fallback);
    } finally {
      setLoading(false);
    }
  }, [key, fallback]);

  useEffect(() => {
    void load();
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !(key in changes)) return;
      const change = changes[key];
      setValueState(change?.newValue ?? fallback);
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [load, key, fallback]);

  const setValue = useCallback(
    async (next: StorageValue<K>) => {
      await storageManager.set(key, next);
      setValueState(next);
    },
    [key],
  );

  const updateValue = useCallback(
    async (updater: (draft: StorageValue<K>) => void) => {
      const next = await storageManager.update(key, updater);
      setValueState(next);
    },
    [key],
  );

  const remove = useCallback(async () => {
    await storageManager.remove(key);
    setValueState(undefined);
  }, [key]);

  return useMemo(
    () => ({ value, loading, error, setValue, updateValue, remove, refresh: load }),
    [value, loading, error, setValue, updateValue, remove, load],
  );
}

export function useToggle<K extends StorageKey>(
  key: K,
  defaultValue = false,
): [boolean, () => void, boolean] {
  const { value, setValue, loading } = useStorage(key, defaultValue as StorageValue<K>);

  const resolved = useMemo(() => {
    if (typeof value === 'boolean') return value;
    if (value && typeof value === 'object' && 'enabled' in value) {
      return Boolean((value as Record<string, unknown>).enabled);
    }
    return Boolean(value);
  }, [value]);

  const toggle = useCallback(() => {
    if (typeof value === 'boolean') {
      void setValue(!resolved as unknown as StorageValue<K>);
      return;
    }

    if (value && typeof value === 'object' && 'enabled' in value) {
      const next = {
        ...(value as Record<string, unknown>),
        enabled: !resolved,
      } as unknown as StorageValue<K>;
      void setValue(next);
      return;
    }

    void setValue(!resolved as unknown as StorageValue<K>);
  }, [resolved, setValue, value]);

  return [resolved, toggle, loading];
}
