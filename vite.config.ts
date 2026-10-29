import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { rolldownOptions: { input: { game: 'index.html', aircraft: 'aircraft.html' } } }, server: { port: 5173, strictPort: true }, preview: { port: 4173, strictPort: true } });
