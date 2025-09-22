import { useCallback, useState } from 'react';

type AsyncFunction<T> = () => Promise<T>;

interface AsyncTaskResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  run: () => Promise<void>;
}

export function useAsyncTask<T>(task: AsyncFunction<T>): AsyncTaskResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await task();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [task]);

  return { data, error, loading, run };
}
