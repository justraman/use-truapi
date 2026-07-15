import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center items-center text-center flex-1 px-4">
      <h1 className="text-4xl font-bold mb-4">use-truapi</h1>
      <p className="text-fd-muted-foreground max-w-xl mb-8">
        React hooks and Vue composables for TruAPI products.
        One install: chain queries, accounts, transactions, contracts, chat,
        statements, payments and cloud storage.
      </p>
      <div className="flex gap-3">
        <Link
          href="/docs"
          className="px-4 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm"
        >
          Documentation
        </Link>
        <Link
          href="/docs/getting-started"
          className="px-4 py-2 rounded-lg border font-medium text-sm"
        >
          Getting started
        </Link>
      </div>
    </div>
  );
}
