import type { ReactNode } from "react";

/** Card wrapping one SDK area; each child row demos a single hook. */
export function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      {desc && <p className="card-desc">{desc}</p>}
      <div className="card-rows">{children}</div>
    </section>
  );
}

/** One row: chip(s) naming the hook(s) on the left, their live demo on the right. */
export function HookRow({ hook, children }: { hook: string | string[]; children: ReactNode }) {
  const hooks = Array.isArray(hook) ? hook : [hook];
  return (
    <div className="hook-row">
      <div className="hook-names">
        {hooks.map((name) => (
          <code key={name} className="hook-chip">
            {name}
          </code>
        ))}
      </div>
      <div className="hook-demo">{children}</div>
    </div>
  );
}

export function hexPreview(bytes: Uint8Array, take = 8): string {
  return `0x${Array.from(bytes.slice(0, take))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}…`;
}
