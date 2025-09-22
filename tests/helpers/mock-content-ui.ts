import type { PropsWithChildren, ReactNode, SVGProps } from 'react';
import { vi } from 'vitest';
import type { ContentScriptContext } from 'wxt/client';

export const shadowHosts = new Map<string, HTMLElement>();
export const shadowUiInstances = new Map<string, { mount: () => void; remove: () => void }>();

const asyncMountNames = new Set(['wxt-starter-toast']);

let isRegistered = false;

interface ShadowUiOptions {
  name?: string;
  position?: 'inline' | 'overlay' | 'modal';
  alignment?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  zIndex?: number;
  mode?: 'open' | 'closed';
  onMount?: (container: HTMLElement, shadowRoot: ShadowRoot | null, host: HTMLElement) => unknown;
  onRemove?: (mountedRoot: unknown) => void;
}

export const createShadowRootUiMock = vi.fn(
  async (_ctx: ContentScriptContext, options: ShadowUiOptions) => {
    const host = document.createElement('div');
    host.dataset.shadowName = options.name ?? 'unknown';
    document.body.append(host);

    const container = document.createElement('div');
    host.append(container);

    shadowHosts.set(options.name ?? 'unknown', host);

    let mountedRoot: unknown = null;

    const mount = () => {
      const invokeMount = () => {
        mountedRoot = options.onMount?.(container, null, host) ?? null;
      };

      if (options.name && asyncMountNames.has(options.name)) {
        setTimeout(invokeMount, 0);
      } else {
        invokeMount();
      }
    };

    const remove = () => {
      options.onRemove?.(mountedRoot);
      host.remove();
      shadowHosts.delete(options.name ?? 'unknown');
      shadowUiInstances.delete(options.name ?? 'unknown');
    };

    shadowUiInstances.set(options.name ?? 'unknown', { mount, remove });

    return { mount, remove };
  },
);

export function registerContentUiMocks() {
  if (isRegistered) return;
  isRegistered = true;

  vi.mock('@assets/styles/globals.css', () => ({}));

  vi.mock('wxt/client', () => ({
    createShadowRootUi: createShadowRootUiMock,
  }));

  vi.mock('framer-motion', async () => {
    const React = await vi.importActual<typeof import('react')>('react');
    const motionPropKeys = new Set([
      'variants',
      'initial',
      'animate',
      'exit',
      'layout',
      'layoutId',
      'drag',
      'dragListener',
      'dragMomentum',
      'dragConstraints',
      'dragElastic',
      'whileHover',
      'whileTap',
      'whileDrag',
      'transition',
      'custom',
    ]);

    const componentFactory = (tag: string) => {
      const MotionComponent = ({
        children,
        ...props
      }: PropsWithChildren<Record<string, unknown>>) => {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(props)) {
          if (!motionPropKeys.has(key)) {
            sanitized[key] = value;
          }
        }
        return React.createElement(tag, sanitized, children);
      };
      MotionComponent.displayName = `motion.${tag}`;
      return MotionComponent;
    };

    const AnimatePresence = ({ children }: { children?: ReactNode }) =>
      React.createElement(React.Fragment, null, children);
    AnimatePresence.displayName = 'AnimatePresence';

    return {
      AnimatePresence,
      motion: new Proxy(
        {},
        {
          get: (_target, key: string) => componentFactory(key),
        },
      ),
      useAnimationControls: () => ({
        start: vi.fn(),
        stop: vi.fn(),
      }),
      useReducedMotion: () => false,
    };
  });

  vi.mock('lucide-react', async () => {
    const React = await vi.importActual<typeof import('react')>('react');
    const Icon = (props: SVGProps<SVGSVGElement>) => React.createElement('svg', props);
    Icon.displayName = 'Icon';
    return { Copy: Icon, Sparkles: Icon, X: Icon };
  });
}
