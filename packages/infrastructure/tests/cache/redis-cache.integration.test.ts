import { afterAll, describe, expect, it } from "vitest";
import { RedisCache } from "../../src/cache/redis-cache.js";

const url = process.env.REDIS_CACHE_URL;

describe.skipIf(!url)("RedisCache integration", () => {
  const cache = new RedisCache({
    url: url!,
    keyPrefix: "aspros-node-framework-test:",
    onError: (error) => console.error("Redis integration client error:", error),
  });
  const keys: string[] = [];

  it("stores, reads, expires, and deletes JSON values against Redis", async () => {
    await cache.start();
    const key = `round-trip:${Date.now()}:${Math.random()}`;
    keys.push(key);

    await cache.set(key, { value: "redis", count: 2 }, { ttlSeconds: 30 });
    expect(await cache.get(key)).toEqual({ value: "redis", count: 2 });
    expect(await cache.expire(key, 60)).toBe(true);
    expect(await cache.delete(key)).toBe(true);
    expect(await cache.get(key)).toBeNull();
  });

  afterAll(async () => {
    for (const key of keys) {
      try { await cache.delete(key); } catch { /* Preserve the test failure. */ }
    }
    await cache.stop();
  });
});
