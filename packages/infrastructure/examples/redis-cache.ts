import { RedisCache } from "../src/cache/redis-cache.js";
import { InfrastructureRuntime } from "../src/runtime/infrastructure-runtime.js";

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

try {
  // Business code depends on cache operations, not Redis commands or client setup.
  // 业务代码只使用缓存操作，不需要接触 Redis 命令或客户端初始化。
  await redisCache.set("trade:1001", { status: "confirmed" }, { ttlSeconds: 300 });
  const cachedTrade = await redisCache.get<{ status: string }>("trade:1001");
  console.info(cachedTrade);
} finally {
  await infrastructure.stop();
}
