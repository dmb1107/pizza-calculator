import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves this repo from https://<user>.github.io/pizza-calculator/.
// Without `base`, every asset URL resolves to the domain root and the page
// silently loads nothing. If the repo is ever renamed, change this too.
const REPO_NAME = 'pizza-calculator';

export default defineConfig({
  base: `/${REPO_NAME}/`,
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
