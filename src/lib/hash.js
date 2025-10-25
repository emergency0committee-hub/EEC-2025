export async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(String(password || ""));
  if (window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback (non-cryptographic) if SubtleCrypto unavailable
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i];
    hash |= 0;
  }
  return String(hash >>> 0);
}

