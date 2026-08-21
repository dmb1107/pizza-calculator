import { C } from './lib/constants';

/**
 * Placeholder shell. The real UI is built in plan Tasks 2-8; this exists so
 * the toolchain is verifiable end to end from the first commit.
 */
export default function App() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        Biga Neapolitan Dough Calculator
      </h1>
      <p className="mt-3 text-lg text-stone-600 dark:text-stone-400">
        {Math.round(C.BIGA_FRACTION * 100)}% biga · {Math.round(C.HYDRATION * 100)}% hydration ·{' '}
        {(C.SALT * 100).toFixed(1)}% salt
      </p>
      <p className="mt-8 rounded-lg border border-stone-300 bg-stone-100 p-4 text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
        Scaffold only. The calculation engine is plan Task 1 — see{' '}
        <code className="font-mono text-sm">IMPLEMENTATION-PLAN.md</code>.
      </p>
    </main>
  );
}
