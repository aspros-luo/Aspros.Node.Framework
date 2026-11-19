import { createClient } from "redis";
import type { InfrastructureResource } from "../runtime/infrastructure-runtime.js";

export interface RedisCacheOptions {
  /** Redis connection URL, supplied by the application host. / 由应用宿主提供的 Redis 连接 URL。 */
  readonly url: string;
  /** Optional key namespace shared by this cache instance. / 此缓存实例使用的可选 Key 命名空间。 */
  readonly keyPrefix?: string;
  /** Socket connection timeout in milliseconds. / Socket 连接超时时间（毫秒）。 */
  readonly connectTimeoutMs?: number;
  /** Whether commands issued while disconnected are rejected instead of queued. Defaults to true. / 断线期间是否拒绝命令而非排队，默认 true。 */
  readonly disableOfflineQueue?: boolean;
  /** The host owns logging and decides how Redis client errors are reported. / 日志由宿主负责，宿主决定如何报告 Redis 客户端错误。 */
  readonly onError: (error: Error) => void;
}

export interface RedisCacheSetOptions {
  /** Expiration in seconds. Omit for a key without an expiration. / 过期秒数；省略时不设置过期时间。 */
  readonly ttlSeconds?: number;
}

/**
 * A small JSON cache adapter backed by the official node-redis client.
 * 基于官方 node-redis 客户端的轻量 JSON 缓存适配器。
 *
 * The host creates this adapter and registers it with InfrastructureRuntime.
 * It deliberately does not own configuration loading, logging, retries for
 * business operations, distributed locks, or cache-aside orchestration.
 *
 * 宿主创建此适配器并将其注册到 InfrastructureRuntime。
 * 它刻意不负责读取配置、日志、业务操作重试、分布式锁或 Cache-Aside 编排。
 */
export class RedisCache implements InfrastructureResource {
  public readonly name = "redis-cache";

  private readonly client: ReturnType<typeof createClient>;
  private readonly keyPrefix: string;
  private state: "new" | "started" | "stopped" = "new";

  public constructor(options: RedisCacheOptions) {
    assertRedisCacheOptions(options);

    this.keyPrefix = options.keyPrefix ?? "";
    this.client = createClient({
      url: options.url,
      ...(options.connectTimeoutMs === undefined
        ? {}
        : { socket: { connectTimeout: options.connectTimeoutMs } }),
      disableOfflineQueue: options.disableOfflineQueue ?? true,
    });

    this.client.on("error", (error) => options.onError(error));
  }

  /** Connect once; partial connection state is cleaned up before failure escapes. / 只连接一次；连接失败时先清理部分初始化状态。 */
  public async start(): Promise<void> {
    if (this.state !== "new") {
      throw new Error(`Redis cache cannot start from state "${this.state}".`);
    }

    try {
      await this.client.connect();
      this.state = "started";
    } catch (error) {
      if (this.client.isOpen) {
        this.client.destroy();
      }
      this.state = "stopped";
      throw error;
    }
  }

  /** Close the client; a failed close can be retried by InfrastructureRuntime. / 关闭客户端；关闭失败时可由 InfrastructureRuntime 重试。 */
  public async stop(): Promise<void> {
    if (this.state === "stopped") return;

    if (this.client.isOpen) {
      await this.client.close();
    }
    this.state = "stopped";
  }

  public async get<T>(key: string): Promise<T | null> {
    this.assertReady();
    const value = await this.client.get(this.toRedisKey(key));
    if (value === null) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new Error(`Cached value for key "${key}" is not valid JSON.`, { cause: error });
    }
  }

  public async set<T>(key: string, value: T, options: RedisCacheSetOptions = {}): Promise<void> {
    this.assertReady();
    assertCacheKey(key);
    assertTtl(options.ttlSeconds);

    if (value === null || value === undefined) {
      throw new TypeError("Redis cache values must not be null or undefined.");
    }

    const serialized = JSON.stringify(value);
    if (serialized === undefined) {
      throw new TypeError("Redis cache value could not be serialized as JSON.");
    }

    const redisKey = this.toRedisKey(key);
    if (options.ttlSeconds === undefined) {
      await this.client.set(redisKey, serialized);
    } else {
      await this.client.set(redisKey, serialized, { EX: options.ttlSeconds });
    }
  }

  public async delete(key: string): Promise<boolean> {
    this.assertReady();
    return (await this.client.del(this.toRedisKey(key))) > 0;
  }

  /** Set or replace the expiration of an existing key. / 设置或更新已有 Key 的过期时间。 */
  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    this.assertReady();
    assertTtl(ttlSeconds);
    return this.client.expire(this.toRedisKey(key), ttlSeconds);
  }

  private toRedisKey(key: string): string {
    assertCacheKey(key);
    return `${this.keyPrefix}${key}`;
  }

  private assertReady(): void {
    if (this.state !== "started" || !this.client.isReady) {
      throw new Error("Redis cache is not ready. Register it with InfrastructureRuntime and start the runtime first.");
    }
  }
}

function assertRedisCacheOptions(options: RedisCacheOptions): void {
  if (typeof options.onError !== "function") {
    throw new TypeError("Redis cache onError callback is required.");
  }

  let connection: URL;
  try {
    connection = new URL(options.url);
  } catch {
    throw new TypeError("Redis cache URL must be a valid redis:// or rediss:// URL.");
  }

  if (connection.protocol !== "redis:" && connection.protocol !== "rediss:") {
    throw new TypeError("Redis cache URL must use redis:// or rediss://.");
  }
  if (options.keyPrefix !== undefined && options.keyPrefix.length === 0) {
    throw new TypeError("Redis cache keyPrefix must not be empty when provided.");
  }
  if (options.connectTimeoutMs !== undefined &&
      (!Number.isInteger(options.connectTimeoutMs) || options.connectTimeoutMs <= 0)) {
    throw new TypeError("Redis cache connectTimeoutMs must be a positive integer.");
  }
}

function assertCacheKey(key: string): void {
  if (key.trim().length === 0) {
    throw new TypeError("Redis cache key must not be empty.");
  }
}

function assertTtl(ttlSeconds: number | undefined): void {
  if (ttlSeconds !== undefined && (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0)) {
    throw new TypeError("Redis cache ttlSeconds must be a positive integer.");
  }
}
