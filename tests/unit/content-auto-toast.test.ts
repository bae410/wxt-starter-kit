import { act } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type SpyInstance,
} from 'vitest';
import type { ContentScriptContext } from 'wxt/client';

const createShadowRootUiMock = vi.fn();
const messageBusSubscribeMock = vi.fn();
const messageBusEmitMock = vi.fn();

vi.mock('wxt/sandbox', () => ({
  defineContentScript: (config: unknown) => config,
}));

vi.mock('@entry/content/ui', () => ({
  createShadowRootUI: createShadowRootUiMock,
}));

vi.mock('@lib/messaging/bus', () => ({
  messageBus: {
    subscribe: messageBusSubscribeMock,
    emit: messageBusEmitMock,
  },
}));

type UiController = {
  updateSelection: ReturnType<typeof vi.fn>;
  flashMessage: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const controllers: UiController[] = [];

let readyStateValue: DocumentReadyState = 'complete';
const readyStateDescriptor = Object.getOwnPropertyDescriptor(document, 'readyState');

beforeAll(() => {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    get: () => readyStateValue,
  });
});

afterAll(() => {
  if (readyStateDescriptor) {
    Object.defineProperty(document, 'readyState', readyStateDescriptor);
  }
});

const setReadyState = (value: DocumentReadyState) => {
  readyStateValue = value;
};

const createContext = () => {
  const invalidationCallbacks: Array<() => void> = [];

  const ctx = {
    onInvalidated: (callback: () => void) => {
      invalidationCallbacks.push(callback);
      return () => {
        const index = invalidationCallbacks.indexOf(callback);
        if (index !== -1) invalidationCallbacks.splice(index, 1);
      };
    },
  } satisfies Partial<ContentScriptContext> as ContentScriptContext;

  return {
    ctx,
    runInvalidation: () => {
      invalidationCallbacks.forEach((callback) => callback());
    },
  };
};

const importContentMain = async () => {
  const module = await import('@entry/content/index');
  return module.default.main;
};

const beforeUnloadHandlers = new Set<EventListenerOrEventListenerObject>();

let addEventListenerSpy: SpyInstance<
  Parameters<typeof window.addEventListener>,
  ReturnType<typeof window.addEventListener>
>;
let removeEventListenerSpy: SpyInstance<
  Parameters<typeof window.removeEventListener>,
  ReturnType<typeof window.removeEventListener>
>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  controllers.length = 0;
  messageBusSubscribeMock.mockReset();
  messageBusEmitMock.mockReset();
  messageBusSubscribeMock.mockImplementation(() => vi.fn());
  createShadowRootUiMock.mockImplementation(async () => {
    const controller: UiController = {
      updateSelection: vi.fn(),
      flashMessage: vi.fn(),
      destroy: vi.fn(),
    };
    controllers.push(controller);
    return controller;
  });

  const originalAdd = window.addEventListener.bind(window);
  const originalRemove = window.removeEventListener.bind(window);

  addEventListenerSpy = vi
    .spyOn(window, 'addEventListener')
    .mockImplementation(
      (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) => {
        if (type === 'beforeunload' && listener) {
          beforeUnloadHandlers.add(listener);
        }
        // Preserve native behaviour for other listeners
        return originalAdd(
          type,
          listener as EventListener,
          options as AddEventListenerOptions | boolean | undefined,
        );
      },
    );

  removeEventListenerSpy = vi
    .spyOn(window, 'removeEventListener')

    .mockImplementation(
      (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
      ) => {
        if (type === 'beforeunload' && listener) {
          beforeUnloadHandlers.delete(listener);
        }
        return originalRemove(
          type,
          listener as EventListener,
          options as EventListenerOptions | boolean | undefined,
        );
      },
    );
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  addEventListenerSpy.mockRestore();
  removeEventListenerSpy.mockRestore();
  beforeUnloadHandlers.clear();
});

describe('content script auto-toast scheduling', () => {
  it('shows welcome toast after default delay when document is already loaded', async () => {
    setReadyState('complete');

    const { ctx } = createContext();
    const main = await importContentMain();

    await act(async () => {
      await main(ctx);
    });

    const controller = controllers[0];
    expect(controller).toBeDefined();
    expect(controller.flashMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1999);
    expect(controller.flashMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(controller.flashMessage).toHaveBeenCalledTimes(1);
    expect(controller.flashMessage).toHaveBeenCalledWith('WXT Starter is ready on this page.');
  });

  it('waits for load event when document is still loading', async () => {
    setReadyState('loading');

    const { ctx } = createContext();
    const main = await importContentMain();

    await act(async () => {
      await main(ctx);
    });

    const controller = controllers[0];
    expect(controller).toBeDefined();

    await vi.advanceTimersByTimeAsync(4000);
    expect(controller.flashMessage).not.toHaveBeenCalled();

    setReadyState('complete');
    window.dispatchEvent(new Event('load'));

    await vi.advanceTimersByTimeAsync(2000);
    expect(controller.flashMessage).toHaveBeenCalledTimes(1);
  });

  it('clears scheduled toast when context invalidates', async () => {
    setReadyState('complete');

    const { ctx, runInvalidation } = createContext();
    const main = await importContentMain();

    await act(async () => {
      await main(ctx);
    });

    const controller = controllers[0];
    expect(controller).toBeDefined();

    runInvalidation();

    await vi.advanceTimersByTimeAsync(5000);
    expect(controller.flashMessage).not.toHaveBeenCalled();
  });

  it('stops pending toast when beforeunload fires', async () => {
    setReadyState('complete');

    const { ctx } = createContext();
    const main = await importContentMain();

    await act(async () => {
      await main(ctx);
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    window.dispatchEvent(new Event('beforeunload'));
    await vi.advanceTimersByTimeAsync(3000);

    const controller = controllers[0];
    expect(controller.flashMessage).not.toHaveBeenCalled();
  });

  it('prevents multiple welcome toasts from scheduling twice', async () => {
    setReadyState('complete');

    const { ctx } = createContext();
    const main = await importContentMain();

    await act(async () => {
      await main(ctx);
      await main(ctx);
    });

    const controller = controllers[0];
    expect(controller).toBeDefined();

    await vi.advanceTimersByTimeAsync(2000);
    expect(controller.flashMessage).toHaveBeenCalledTimes(1);
  });
});
