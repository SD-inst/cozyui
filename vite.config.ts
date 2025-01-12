import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './',
    server: {
        host: '172.25.10.35',
        proxy: {
            '/cui/ws': {
                target: 'ws://172.25.10.35:7861',
                ws: true,
            },
            '/cui/api': {
                target: 'http://172.25.10.35:7861',
            },
        },
    },
});
