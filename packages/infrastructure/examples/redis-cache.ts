import { RedisCache } from "../src/cache/redis-cache.js";
import { InfrastructureRuntime } from "../src/runtime/infrastructure-runtime.js";

// This port belongs to the consuming Application layer, not Infrastructure.
// 这个 Port 应由消费它的 Application 层拥有，而不是由 Infrastructure 拥有。
interface OrderCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ttlSeconds?: number }): Promise<void>;
}

// The host reads secrets/configuration and passes typed options to the provider.
// 宿主读取密钥和配置，再将类型化选项传给 Provider。
const redisCache = new RedisCache({
  url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  keyPrefix: "orders:",
  disableOfflineQueue: true,
  onError: (error) => {
    // Forward to the host's logger; Infrastructure does not choose a logger.
    // 转交给宿主自己的 Logger；Infrastructure 不选择具体日志库。
    console.error("Redis client error:", error);
  },
});

const infrastructure = new InfrastructureRuntime()
  .register(redisCache);

await infrastructure.start();

// Application code sees only its own port; it does not import Redis or node-redis.
// Application 代码只依赖自己定义的 Port，不导入 Redis 或 node-redis。
async function getOrderSnapshot(cache: OrderCache, orderId: string) {
  const key = orderId;
  const cached = await cache.get<{ status: string }>(key);
  if (cached) return cached;

  // A real application would load the order from its Repository here.
  // 实际业务会在这里通过 Repository 查询订单。
  const snapshot = { status: "confirmed" };
  await cache.set(key, snapshot, { ttlSeconds: 300 });
  return snapshot;
}

try {
  const orderSnapshot = await getOrderSnapshot(redisCache, "trade:1001");
  console.info(orderSnapshot);
} finally {
  await infrastructure.stop();
}
