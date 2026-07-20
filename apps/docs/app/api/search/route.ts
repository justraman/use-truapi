import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;

// staticGET serves the whole pre-built Orama index as one payload, so the
// route survives `output: "export"` (GitHub Pages); the client runs the
// search in-browser (see RootProvider in app/layout.tsx).
export const { staticGET: GET } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});
