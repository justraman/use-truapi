import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// STATIC_EXPORT=1 produces a fully static site (GitHub Pages) — see
// .github/workflows/docs.yml. NEXT_PUBLIC_BASE_PATH is the Pages sub-path
// (e.g. /use-truapi for use-truapi.github.io/use-truapi); leave it unset for
// a custom domain served from the root.
const isStaticExport = process.env.STATIC_EXPORT === '1';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  ...(isStaticExport && {
    output: 'export',
    trailingSlash: true,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  }),
};

export default withMDX(config);
