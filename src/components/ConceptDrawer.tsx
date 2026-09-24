import { Drawer } from './Drawer';
import { Markdown } from './Markdown';
import { conceptById } from '../content/concepts';

/** §8.3 concepts. §8.3 allows "a drawer, modal, or /concepts/:id route". */
export function ConceptDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const concept = id ? conceptById(id) : undefined;
  return (
    <Drawer open={id !== null} title={concept?.title ?? 'Not found'} onClose={onClose}>
      {concept ? (
        <Markdown>{concept.body}</Markdown>
      ) : (
        <p className="text-stone-600 dark:text-stone-400">No concept with id “{id}”.</p>
      )}
    </Drawer>
  );
}
