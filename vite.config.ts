import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Served from the root of pizza.dave-becker.com by the Worker (spec §2, §14).
  base: '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Pin the zone so the timeline's daylight-saving and midnight cases are
    // deterministic instead of depending on whoever runs the suite.
    env: { TZ: 'America/New_York' },
  },
});
