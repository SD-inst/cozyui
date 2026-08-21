import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

// Separate config so that vitest does not load vite.config.ts
// (which shells out to git for the version string).
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
    },
});
