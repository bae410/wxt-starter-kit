import { useEffect, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import type { ContentScriptContext } from 'wxt/client';
import { createShadowRootUi } from 'wxt/client';

import { ContentSelectionPanel } from '@components/features/content-selection-panel';
import { ContentToastLayer } from '@components/features/content-toast-layer';

import { createToastBridge } from '@lib/content/hooks/use-toast-controls';

interface UiController {
  updateSelection: (value: string) => void;
  flashMessage: (text: string) => void;
  destroy: () => void;
}

/**
 * Mounts the content script UI into shadow DOM roots and returns a controller
 * for sending selection updates and toast messages across those isolated trees.
 */
export async function createShadowRootUI(ctx: ContentScriptContext): Promise<UiController> {
  const mountNodes = new WeakMap<Root, HTMLElement>();
  const selectionControl: { setSelection: (value: string) => void } = {
    setSelection: () => undefined,
  };
  const toastBridge = createToastBridge();

  const App = () => {
    const [selection, setSelection] = useState('');

    useEffect(() => {
      selectionControl.setSelection = setSelection;
    }, []);

    return <ContentSelectionPanel selection={selection} />;
  };

  const ToastLayer = ({ host }: { host: HTMLElement }) => (
    <ContentToastLayer host={host} bridge={toastBridge} />
  );

  const ui = await createShadowRootUi<Root>(ctx, {
    name: 'wxt-starter-panel',
    position: 'inline',
    mode: 'open',
    onMount: (container) => {
      const mountNode = document.createElement('div');
      container.append(mountNode);

      const root = createRoot(mountNode);
      mountNodes.set(root, mountNode);

      root.render(<App />);
      return root;
    },
    onRemove: (root) => {
      if (!root) return;

      root.unmount();
      mountNodes.get(root)?.remove();
      mountNodes.delete(root);
    },
  });

  ui.mount();

  const toastUi = await createShadowRootUi<Root>(ctx, {
    name: 'wxt-starter-toast',
    position: 'overlay',
    alignment: 'top-right',
    zIndex: 2147483647,
    onMount: (container, _shadow, shadowHost) => {
      const mountNode = document.createElement('div');
      container.append(mountNode);

      const root = createRoot(mountNode);
      mountNodes.set(root, mountNode);

      root.render(<ToastLayer host={shadowHost} />);
      return root;
    },
    onRemove: (root) => {
      if (!root) return;

      root.unmount();
      mountNodes.get(root)?.remove();
      mountNodes.delete(root);
    },
  });

  toastUi.mount();

  return {
    updateSelection: (value) => selectionControl.setSelection(value),
    flashMessage: (text) => toastBridge.enqueue(text),
    destroy: () => {
      ui.remove();
      toastUi.remove();
    },
  };
}
