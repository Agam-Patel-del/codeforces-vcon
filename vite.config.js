import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

function manifestPlugin(targetBrowser = 'chrome') {
  return {
    name: 'generate-manifest',
    generateBundle() {
      const manifest = {
        manifest_version: 3,
        name: 'Codeforces Virtual Contests',
        version: '1.0.0',
        description: 'View your complete Codeforces virtual contest history with predicted rating changes.',
        icons: {
          '16': 'icons/icon16.png',
          '48': 'icons/icon48.png',
          '128': 'icons/icon128.png'
        },
        permissions: [
          'storage',
          'unlimitedStorage'
        ],
        host_permissions: [
          'https://codeforces.com/api/*'
        ],
        content_scripts: [
          {
            matches: [
              'https://codeforces.com/*',
              'https://*.codeforces.com/*'
            ],
            js: ['content.js'],
            run_at: 'document_idle'
          }
        ],
        web_accessible_resources: [
          {
            resources: ['virtual-contests.html'],
            matches: ['https://codeforces.com/*', 'https://*.codeforces.com/*']
          }
        ]
      };

      if (targetBrowser === 'firefox') {
        manifest.background = {
          scripts: ['background.js']
        };
        manifest.browser_specific_settings = {
          gecko: {
            id: 'cf-virtual-contests@agam-patel',
            strict_min_version: '109.0'
          }
        };
      } else {
        manifest.background = {
          service_worker: 'background.js'
        };
      }

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2)
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const target = process.env.TARGET_BROWSER || mode || 'chrome';
  const outDir = target === 'firefox' ? 'dist/firefox' : 'dist/chrome';

  return {
    plugins: [react(), manifestPlugin(target)],
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          'virtual-contests': resolve(__dirname, 'virtual-contests.html'),
          'content': resolve(__dirname, 'src/content/content.jsx'),
          'background': resolve(__dirname, 'src/background/background.js'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'content') return 'content.js';
            if (chunkInfo.name === 'background') return 'background.js';
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  };
});
