import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FetchOptionsSnapshot = Record<string, unknown>;
type RequestSnapshot = { request: unknown; options?: Record<string, unknown> };
type HandlerWithRaw = ReturnType<typeof vi.fn> & { raw: ReturnType<typeof vi.fn> };

const state = {
  createCalls: [] as FetchOptionsSnapshot[],
  requestCalls: [] as RequestSnapshot[],
  rawCalls: [] as RequestSnapshot[],
  nextError: null as null | { status: number },
  defaults: {} as Record<string, unknown>,
};

const runHooks = async (hook: unknown, context: Record<string, unknown>): Promise<void> => {
  const hooks = Array.isArray(hook) ? hook : hook ? [hook] : [];
  for (const entry of hooks) {
    await (entry as (ctx: Record<string, unknown>) => unknown)(context);
  }
};

vi.mock('ofetch', () => {
  class FetchError extends Error {
    status?: number;
    statusCode?: number;
    data?: unknown;
    response?: unknown;
    request?: unknown;

    constructor(message: string) {
      super(message);
      this.name = 'FetchError';
    }
  }

  const handler = vi.fn(async (request: unknown, options: Record<string, unknown> = {}) => {
    state.requestCalls.push({ request, options });

    await runHooks(options.onRequest, {
      request,
      options: { ...state.defaults, ...options },
    });

    if (state.nextError) {
      const error = new FetchError('request failed');
      error.status = state.nextError.status;
      error.response = { status: state.nextError.status };
      error.request = request;

      try {
        await runHooks(options.onResponseError, {
          request,
          options: { ...state.defaults, ...options },
          response: error.response,
          error,
        });
      } catch (hookError) {
        state.nextError = null;
        throw hookError;
      }

      state.nextError = null;
      throw error;
    }

    await runHooks(options.onResponse, {
      request,
      options: { ...state.defaults, ...options },
      response: { ok: true, status: 200 },
    });

    return { ok: true };
  }) as unknown as HandlerWithRaw;

  handler.raw = vi.fn(async (request: unknown, options: Record<string, unknown> = {}) => {
    state.rawCalls.push({ request, options });
    return { ok: true, status: 201, _data: { ok: true } } as unknown;
  }) as HandlerWithRaw['raw'];

  const create = vi.fn((defaults: FetchOptionsSnapshot) => {
    state.defaults = defaults;
    state.createCalls.push(defaults);
    return handler as unknown;
  });

  const ofetch = Object.assign(handler as unknown as Record<string, unknown>, {
    create,
    raw: handler.raw,
    native: vi.fn(),
  });

  return {
    ofetch,
    FetchError,
    __state: state,
  };
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  state.createCalls.length = 0;
  state.requestCalls.length = 0;
  state.rawCalls.length = 0;
  state.nextError = null;
  state.defaults = {};
});

afterEach(() => {
  vi.resetModules();
});

describe('createHttpClient', () => {
  it('initialises with retry disabled and passes base URL defaults to ofetch', async () => {
    const { createHttpClient } = await import('@lib/api/http-client');
    const { __state } = (await import('ofetch')) as unknown as { __state: typeof state };

    const client = createHttpClient({ baseURL: 'https://api.test', retry: 2, name: 'unit' });
    await client('/users');

    expect(__state.createCalls.at(-1)).toMatchObject({ baseURL: 'https://api.test', retry: 2 });
    expect(__state.requestCalls).toHaveLength(1);
    expect(__state.requestCalls[0]?.request).toBe('/users');
    expect(typeof __state.requestCalls[0]?.options?.onResponseError).toBeDefined();
  });

  it('wraps FetchError instances into HttpClientError with status metadata', async () => {
    const { createHttpClient, HttpClientError } = await import('@lib/api/http-client');
    const { __state } = (await import('ofetch')) as unknown as { __state: typeof state };

    const client = createHttpClient({ baseURL: 'https://api.test', name: 'unit-error' });
    __state.nextError = { status: 503 };

    await expect(client('/users')).rejects.toBeInstanceOf(HttpClientError);

    try {
      __state.nextError = { status: 502 };
      await client('/users');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpClientError);
      const typedError = error as InstanceType<typeof HttpClientError>;
      expect(typedError.status).toBe(502);
    }
  });
});
