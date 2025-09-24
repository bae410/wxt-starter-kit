import type {
  FetchContext,
  FetchHook,
  FetchOptions,
  FetchRequest,
  FetchResponse,
  MappedResponseType,
  ResponseType,
} from 'ofetch';
import { FetchError, ofetch } from 'ofetch';

interface DebugOptions {
  debug?: boolean;
  name?: string;
}

export type HttpRequestOptions<R extends ResponseType = 'json', T = unknown> = FetchOptions<
  R,
  T
> & {
  debug?: boolean;
};

export type CreateHttpClientOptions<T = unknown> = FetchOptions<ResponseType, T> & DebugOptions;

export class HttpClientError<T = unknown> extends Error {
  readonly status?: number;
  readonly data?: T;
  readonly response?: FetchResponse<T>;
  readonly request?: FetchRequest;
  readonly originalError: FetchError<T>;
  readonly requestLabel?: string;

  constructor(error: FetchError<T>, requestLabel?: string) {
    super(error.message);
    this.name = 'HttpClientError';
    this.status = typeof error.status === 'number' ? error.status : error.statusCode;
    this.data = error.data as T | undefined;
    this.response = error.response as FetchResponse<T> | undefined;
    this.request = error.request;
    this.originalError = error;
    this.requestLabel = requestLabel;
  }
}

export interface HttpClient {
  <T = unknown, R extends ResponseType = 'json'>(
    path: FetchRequest,
    options?: HttpRequestOptions<R, T>,
  ): Promise<MappedResponseType<R, T>>;
  raw<T = unknown, R extends ResponseType = 'json'>(
    path: FetchRequest,
    options?: HttpRequestOptions<R, T>,
  ): Promise<FetchResponse<MappedResponseType<R, T>>>;
}

export function createHttpClient<T = unknown>(
  options: CreateHttpClientOptions<T> = {},
): HttpClient {
  const { debug = import.meta.env.DEV, name, ...fetchOptions } = options;

  const baseOptions: FetchOptions<ResponseType, T> = {
    ...fetchOptions,
    retry: fetchOptions.retry ?? false,
  };

  const instance = ofetch.create(baseOptions);

  const applyInternalHooks = <RType extends ResponseType, TType>(
    requestOptions?: HttpRequestOptions<RType, TType>,
  ): FetchOptions<RType, TType> => {
    const { debug: requestDebug, ...rest } = requestOptions ?? {};
    const shouldDebug = requestDebug ?? debug;

    return {
      ...rest,
      onRequest: mergeHooks(rest.onRequest, shouldDebug ? logRequestHook(name) : undefined),
      onRequestError: mergeHooks(
        rest.onRequestError,
        shouldDebug ? logErrorHook(name, 'request') : undefined,
        normalizeErrorHook(name),
      ),
      onResponse: mergeHooks(rest.onResponse, shouldDebug ? logResponseHook(name) : undefined),
      onResponseError: mergeHooks(
        rest.onResponseError,
        shouldDebug ? logErrorHook(name, 'response') : undefined,
        normalizeErrorHook(name),
      ),
    } satisfies FetchOptions<RType, TType>;
  };

  const client = (<Res = unknown, RType extends ResponseType = 'json'>(
    path: FetchRequest,
    requestOptions?: HttpRequestOptions<RType, Res>,
  ) => instance<Res, RType>(path, applyInternalHooks(requestOptions))) as HttpClient;

  client.raw = <Res = unknown, RType extends ResponseType = 'json'>(
    path: FetchRequest,
    requestOptions?: HttpRequestOptions<RType, Res>,
  ) => instance.raw<Res, RType>(path, applyInternalHooks(requestOptions));

  return client;
}

export const httpClient = createHttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'https://api.example.com',
  name: 'api-client',
});

function mergeHooks<TContext extends FetchContext>(
  existing?: FetchHook<TContext> | FetchHook<TContext>[],
  ...additionals: Array<FetchHook<TContext> | undefined>
): FetchHook<TContext> | FetchHook<TContext>[] | undefined {
  const normalized = [] as FetchHook<TContext>[];
  if (existing) {
    if (Array.isArray(existing)) {
      normalized.push(...existing);
    } else {
      normalized.push(existing);
    }
  }

  for (const hook of additionals) {
    if (!hook) continue;
    normalized.push(hook);
  }

  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.length === 1 ? normalized[0] : normalized;
}

function logRequestHook(name?: string): FetchHook {
  return ({ request, options }) => {
    const method = options.method ?? 'GET';
    debugLog(`[http:${name ?? 'client'}] ${method} ${stringifyRequest(request)}`);
  };
}

function logResponseHook(name?: string): FetchHook {
  return ({ request, response }) => {
    if (!response) return;
    debugLog(`[http:${name ?? 'client'}] ${response.status} ${stringifyRequest(request)}`);
  };
}

function logErrorHook(name: string | undefined, phase: 'request' | 'response'): FetchHook {
  return ({ request, error }) => {
    if (!error) return;
    debugLog(`[http:${name ?? 'client'}] ${phase} error for ${stringifyRequest(request)}:`, error);
  };
}

function normalizeErrorHook(name?: string): FetchHook {
  return ({ error }) => {
    if (error instanceof FetchError) {
      throw new HttpClientError(error, name);
    }

    if (error) {
      throw error;
    }
  };
}

function stringifyRequest(request: FetchRequest): string {
  if (typeof request === 'string') return request;
  if (isRequestLike(request)) return request.url;
  const href = tryGetUrlString(request);
  if (href) return href;
  try {
    return String(request);
  } catch {
    return '[unknown-request]';
  }
}

interface RequestLike {
  url: string;
}

function isRequestLike(value: unknown): value is RequestLike {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('url' in value)) {
    return false;
  }

  const requestUrl = (value as Record<string, unknown>).url;
  return typeof requestUrl === 'string';
}

function tryGetUrlString(value: unknown): string | undefined {
  try {
    // This will accept strings and URL-like inputs
    // If invalid, constructor throws and we fall back to undefined
    const u = new URL(String(value));
    return u.toString();
  } catch {
    return undefined;
  }
}

function debugLog(message: string, ...optionalParams: unknown[]): void {
  if (!import.meta.env.DEV) return;
  if (typeof console === 'undefined' || typeof console.debug !== 'function') {
    return;
  }
  /* eslint-disable-next-line no-console */
  console.debug(message, ...optionalParams);
}
