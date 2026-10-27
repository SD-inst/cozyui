import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { execSync } from 'child_process';

process.env.VITE_APP_VERSION = execSync('git describe --tags --always --dirty')
    .toString('utf8')
    .replace(/^\s+|\s+$/g, '');

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './',
    server: {
        host: '0.0.0.0',
        proxy: {
            '/cui/ws': {
                target: 'ws://172.25.10.35:7861',
                ws: true,
            },
            '/cui/api': {
                target: 'http://172.25.10.35:7861',
            },
            '/lora_previews': {
                target: 'http://172.25.10.35:7861',
            },
        },
    },
    build: {
        // 'hidden' writes the .map files without pointing at them from the
        // bundles, so no browser is told to fetch them; `scripts/
        // collect-sourcemaps.mjs` then moves them out of `dist` entirely,
        // because a published map is a published source. They stay on disk for
        // `yarn symbolicate`, which turns a phone's crash report back into
        // `src/...` positions.
        sourcemap: 'hidden',
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom'],
                    mui: [
                        '@mui/material',
                        '@mui/system',
                        '@mui/icons-material',
                        '@emotion/styled',
                        '@emotion/react',
                    ],
                    dexie: ['dexie', 'dexie-react-hooks'],
                },
            },
        },
    },
});
