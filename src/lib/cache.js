/**
 * Lightweight TTL cache backed by localStorage.
 * Used by services to avoid repeated (credit-consuming) LLM / API calls
 * for identical inputs within a short window.
 */
const PREFIX = "cvcraft_cache:";

export function cacheKey(...parts) {
  return parts
    .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
    .join("::");
}

export function getCached(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { value, expires } = JSON.parse(raw);
    if (expires && Date.now() > expires) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function setCached(key, value, ttlMs = 10 * 60 * 1000) {
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ value, expires: Date.now() + ttlMs })
    );
  } catch {
    /* storage full / unavailable — silently skip caching */
  }
}