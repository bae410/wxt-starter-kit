import { resolve } from 'path';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    // manifest_version: 3,
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['storage', 'tabs', 'activeTab', 'scripting', 'contextMenus', 'alarms'],
    host_permissions: ['https://*/*', 'http://*/*'],
    options_ui: {
      page: 'options/index.html',
      open_in_tab: true,
    },
    action: {
      default_popup: 'popup/index.html',
      default_title: 'WXT Starter',
    },
    background: {
      service_worker: 'background.js',
      type: 'module',
    },
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': resolve(__dirname, './'),
        '@components': resolve(__dirname, './components'),
        '@lib': resolve(__dirname, './lib'),
        '@assets': resolve(__dirname, './assets'),
        '@entry': resolve(__dirname, './entrypoints'),
      },
    },
  }),
  runner: {
    startUrls: ['https://naver.com'],
    chromiumArgs: ['--auto-open-devtools-for-tabs'],
  },
  zip: {
    artifactTemplate: 'extension-{{browser}}-v{{version}}.zip',
  },
});
