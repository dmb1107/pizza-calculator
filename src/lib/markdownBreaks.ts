/**
 * §13.2: in the topping ideas' three text fields "a single line break shows
 * as a line break, as it does in Apple Notes", since Dave pastes his notes in
 * as they are. Standard Markdown joins single lines into one paragraph; this
 * turns each soft line break inside a run of text into a hard one.
 *
 * Only the topping fields use it (`<Markdown breaks>`). §8's steps and
 * concepts render as they always have.
 *
 * A remark plugin over the Markdown syntax tree, written here rather than
 * taken as a dependency: it touches text nodes and nothing else, so code
 * spans, code blocks, tables and raw HTML are left as they were.
 */

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
}

/** A line ending, with the spaces and tabs either side of it. */
const LINE_END = /[\t ]*(?:\r\n|\r|\n)[\t ]*/;

function splitLines(node: MdNode): void {
  if (!node.children) return;
  const out: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value !== undefined && LINE_END.test(child.value)) {
      child.value.split(LINE_END).forEach((part, i) => {
        if (i > 0) out.push({ type: 'break' });
        if (part !== '') out.push({ type: 'text', value: part });
      });
    } else {
      splitLines(child);
      out.push(child);
    }
  }
  node.children = out;
}

export function remarkLineBreaks() {
  return (tree: MdNode) => {
    splitLines(tree);
  };
}
