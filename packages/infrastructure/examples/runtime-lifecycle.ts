import { InfrastructureRuntime } from "../src/runtime/infrastructure-runtime.js";

/**
 * The application host owns the concrete clients and explicitly registers
 * their lifecycle. No global service scanning or hidden container is involved.
 *
 * 应用宿主拥有具体客户端，并显式注册其生命周期。
 * 这里没有全局服务扫描，也没有隐藏的容器。
 */
const databaseClient = {
  async connect(): Promise<void> {
    // Initialize the real database client here.
  },
  async close(): Promise<void> {
    // Close the real database client here.
  },
};

const cacheClient = {
  async connect(): Promise<void> {
    // Initialize the real cache client here.
  },
  async close(): Promise<void> {
    // Close the real cache client here.
  },
};

const infrastructure = new InfrastructureRuntime()
  .register({
    name: "database",
    start: () => databaseClient.connect(),
    stop: () => databaseClient.close(),
  })
  .register({
    name: "cache",
    start: () => cacheClient.connect(),
    stop: () => cacheClient.close(),
  });

await infrastructure.start();

try {
  // Start the HTTP host and accept application work only after infrastructure
  // is ready. The host owns signal handling and graceful request draining.
  // Infrastructure 就绪后再启动 HTTP Host 并接收业务请求。
  // 信号处理和请求排空由 Host 自己负责。
} finally {
  await infrastructure.stop();
}
