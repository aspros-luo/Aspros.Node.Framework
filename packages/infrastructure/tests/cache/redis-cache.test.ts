import { beforeEach, describe, expect, it, vi } from "vitest";

const { client } = vi.hoisted(() => ({
  client: {
    on: vi.fn(),
    connect: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    expire: vi.fn(),
    isOpen: false,
    isReady: false,
  },
}));

vi.mock("redis", () => ({
  createClient: vi.fn(() => client),
}));

import { RedisCache } from "../../src/cache/redis-cache.js";

describe("RedisCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.isOpen = false;
    client.isReady = false;
    client.connect.mockImplementation(async () => {
      client.isOpen = true;
      client.isReady = true;
    });
    client.close.mockImplementation(async () => {
      client.isOpen = false;
      client.isReady = false;
    });
    client.get.mockResolvedValue(null);
    client.set.mockResolvedValue("OK");
    client.del.mockResolvedValue(1);
    client.expire.mockResolvedValue(true);
  });

  it("validates its connection options and installs the host error handler", () => {
    const onError = vi.fn();
    expect(() => new RedisCache({ url: "http://localhost:6379", onError })).toThrow(/redis:\/\//i);
    expect(() => new RedisCache({ url: "redis://localhost:6379", connectTimeoutMs: 0, onError }))
      .toThrow(/connectTimeoutMs/);

    const cache = new RedisCache({ url: "redis://localhost:6379", keyPrefix: "app:", onError });
    expect(client.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(cache.name).toBe("redis-cache");
  });

  it("connects and closes through the InfrastructureResource lifecycle", async () => {
    const cache = new RedisCache({ url: "redis://localhost:6379", onError: vi.fn() });

    await cache.start();
    expect(client.connect).toHaveBeenCalledOnce();

    await cache.stop();
    await cache.stop();
    expect(client.close).toHaveBeenCalledOnce();
  });

  it("cleans up a partially opened client when startup fails", async () => {
    const startupError = new Error("connection failed");
    client.connect.mockImplementationOnce(async () => {
      client.isOpen = true;
      throw startupError;
    });
    const cache = new RedisCache({ url: "redis://localhost:6379", onError: vi.fn() });

    await expect(cache.start()).rejects.toBe(startupError);
    expect(client.destroy).toHaveBeenCalledOnce();
  });

  it("serializes JSON values and applies an optional TTL", async () => {
    const cache = new RedisCache({
      url: "redis://localhost:6379",
      keyPrefix: "orders:",
      onError: vi.fn(),
    });
    await cache.start();

    await cache.set("42", { status: "paid" });
    await cache.set("43", "pending", { ttlSeconds: 60 });

    expect(client.set).toHaveBeenNthCalledWith(1, "orders:42", '{"status":"paid"}');
    expect(client.set).toHaveBeenNthCalledWith(2, "orders:43", '"pending"', { EX: 60 });
  });

  it("returns null for a cache miss and deserializes JSON hits", async () => {
    const cache = new RedisCache({ url: "redis://localhost:6379", onError: vi.fn() });
    await cache.start();

    expect(await cache.get("missing")).toBeNull();
    client.get.mockResolvedValueOnce('{"id":7}');
    expect(await cache.get<{ id: number }>("trade")).toEqual({ id: 7 });
  });

  it("supports delete and expiration without exposing raw Redis commands", async () => {
    const cache = new RedisCache({ url: "redis://localhost:6379", onError: vi.fn() });
    await cache.start();

    expect(await cache.delete("trade:7")).toBe(true);
    expect(await cache.expire("trade:7", 30)).toBe(true);
    expect(client.del).toHaveBeenCalledWith("trade:7");
    expect(client.expire).toHaveBeenCalledWith("trade:7", 30);
  });

  it("rejects commands before startup and invalid keys, values, or TTLs", async () => {
    const cache = new RedisCache({ url: "redis://localhost:6379", onError: vi.fn() });
    await expect(cache.get("key")).rejects.toThrow(/not ready/);

    await cache.start();
    await expect(cache.get(" ")).rejects.toThrow(/key must not be empty/);
    await expect(cache.set("key", null)).rejects.toThrow(/must not be null/);
    await expect(cache.set("key", "value", { ttlSeconds: 0 })).rejects.toThrow(/ttlSeconds/);
    await expect(cache.expire("key", -1)).rejects.toThrow(/ttlSeconds/);
  });
});
