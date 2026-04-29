type CacheEntry<T> = { value: T; expires: number };
const store = new Map<string, CacheEntry<any>>();

export async function cached<T>(key: string, ttlSec: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = await loader();
  store.set(key, { value, expires: now + ttlSec * 1000 });
  return value;
}
