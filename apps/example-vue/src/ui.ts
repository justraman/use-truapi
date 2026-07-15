export function hexPreview(bytes: Uint8Array, take = 8): string {
  return `0x${Array.from(bytes.slice(0, take))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}…`;
}
