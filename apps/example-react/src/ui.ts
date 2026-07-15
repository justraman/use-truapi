import type { CSSProperties } from "react";

export const panel: CSSProperties = {
  border: "1px solid #8884",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

export const heading: CSSProperties = { fontSize: 16, marginTop: 0 };

export const badge: CSSProperties = {
  border: "1px solid #8886",
  borderRadius: 999,
  padding: "2px 10px",
  fontSize: 13,
  fontFamily: "monospace",
};

export const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

export const errorText: CSSProperties = { color: "#c33" };

export const muted: CSSProperties = { opacity: 0.6, fontSize: 13 };

export function hexPreview(bytes: Uint8Array, take = 8): string {
  return `0x${Array.from(bytes.slice(0, take))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}…`;
}
