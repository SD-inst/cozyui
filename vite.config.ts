import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

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
