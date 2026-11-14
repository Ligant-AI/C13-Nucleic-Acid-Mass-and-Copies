import { defineConfig } from 'vite';
export default defineConfig({
    base: './',
    build: { modulePreload: { polyfill: false }, target: 'es2022' },
    server: { port: 5183, strictPort: true },
});
