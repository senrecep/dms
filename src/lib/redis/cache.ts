import { getRedis } from "./index";

const DEFAULT_TTL = 3600; // 1 hour

export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await getRedis().get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttl: number = DEFAULT_TTL,
): Promise<void> {
  await getRedis().set(key, JSON.stringify(value), "EX", ttl);
}

export async function cacheDel(key: string): Promise<void> {
  await getRedis().del(key);
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  const redis = getRedis();
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
}
