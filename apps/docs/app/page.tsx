import Link from 'next/link';

// The docs ARE the site: `/` hops straight to the Introduction page. A meta
// refresh (React hoists it into <head>) keeps this working on the static
// GitHub Pages export, where server-side redirects don't exist. The URL is
// relative so it resolves under any basePath.
export default function RootPage() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=docs/" />
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-fd-muted-foreground">
        <Link href="/docs" className="underline">
          Redirecting to the documentation…
        </Link>
      </div>
    </>
  );
}
