/** Prefer Web Crypto SHA-256; fall back to a stable FNV-1a style fingerprint. */
export async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const view = new Uint8Array(bytes);
  let hash = 2166136261;
  for (let i = 0; i < view.length; i += 1) {
    hash ^= view[i]!;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
