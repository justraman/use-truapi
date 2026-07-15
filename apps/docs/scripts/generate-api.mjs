// Generates markdown API references from the react/vue package sources via
// typedoc-plugin-markdown, then rewrites the output so it can be embedded at
// the bottom of hand-written hook pages with fumadocs' `<include>` directive:
//
//   - cross-member links point at .md files that are not routable pages, so
//     they are flattened to plain code spans
//   - headings are demoted one level so the included content nests under the
//     page's own "API reference" heading
//
// Output lands in `generated/{react,vue}/**` (gitignored; regenerate with
// `bun run generate:api`).
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Typedoc writes into a staging dir which is swapped in at the end, so a dev
// server compiling pages mid-run never sees the includes disappear.
for (const target of ['react', 'vue']) {
  const outDir = join(root, 'generated', target);
  const stageDir = join(root, 'generated', `.stage-${target}`);
  rmSync(stageDir, { recursive: true, force: true });
  execFileSync(
    'bunx',
    ['typedoc', '--options', join(root, `typedoc.${target}.json`), '--out', stageDir],
    { cwd: root, stdio: 'inherit' },
  );
  for (const file of walk(stageDir)) {
    writeFileSync(file, transform(readFileSync(file, 'utf8')));
  }
  rmSync(outDir, { recursive: true, force: true });
  renameSync(stageDir, outDir);
  console.log(`generated API reference for @use-truapi/${target}`);
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (path.endsWith('.md')) yield path;
  }
}

function transform(content) {
  const lines = content.split('\n');
  const out = [];
  let inFence = false;
  for (let line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (!inFence) {
      // Demote headings one level (## Parameters -> ### Parameters).
      if (/^#{1,5} /.test(line)) line = `#${line}`;
      // Flatten internal markdown links: [`Foo`](../types/Foo.md) -> `Foo`.
      line = line.replace(/\[([^\]]+)\]\((?!https?:\/\/)[^)]*\.md[^)]*\)/g, '$1');
    }
    out.push(line);
  }
  return out.join('\n');
}
