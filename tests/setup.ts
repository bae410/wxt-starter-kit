import { vi } from 'vitest';

// Mock storage implementation
const mockStorage = new Map<string, unknown>();

// Mock webextension-polyfill/browser to prevent import errors
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      sendMessage: vi.fn(async () => {
        // Simple message bus simulation for tests
        return { ok: true, payload: { success: true } };
      }),
      getManifest: vi.fn(() => ({ version: '1.0.0' })),
    },
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
          if (!keys) {
            const result: Record<string, unknown> = {};
            mockStorage.forEach((value, key) => {
              result[key] = value;
            });
            return result;
          }
          if (typeof keys === 'string') {
            return { [keys]: mockStorage.get(keys) };
          }
          if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            keys.forEach((key) => {
              result[key] = mockStorage.get(key);
            });
            return result;
          }
          return {};
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.entries(items).forEach(([key, value]) => mockStorage.set(key, value));
        }),
        remove: vi.fn(async (key: string) => {
          mockStorage.delete(key);
        }),
      },
    },
    alarms: {
      create: vi.fn(),
      onAlarm: {
        addListener: vi.fn(),
      },
    },
    tabs: {
      sendMessage: vi.fn(),
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: {
        addListener: vi.fn(),
      },
    },
  },
}));

// Global Chrome API mock for tests that directly access chrome
Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => {}),
        remove: vi.fn(async () => {}),
      },
    },
    runtime: {
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      sendMessage: vi.fn(),
      getManifest: vi.fn(() => ({ version: '1.0.0' })),
    },
    alarms: {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    },
    tabs: {
      sendMessage: vi.fn(),
    },
    contextMenus: {
      create: vi.fn(),
      onClicked: { addListener: vi.fn() },
    },
  },
  writable: true,
});
