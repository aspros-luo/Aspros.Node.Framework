/**
 * Coordinates explicitly registered infrastructure resources.
 * 协调显式注册的基础设施资源。
 *
 * Resources start in registration order and stop in reverse order.
 * 资源按注册顺序启动，并按相反顺序停止。
 */
export interface InfrastructureResource {
  /** Stable diagnostic name; names must be unique within one runtime. / 稳定的诊断名称；同一 Runtime 内必须唯一。 */
  readonly name: string;

  /** Acquire this resource's process-level resources. / 初始化并获取该资源的进程级资源。 */
  start(): void | Promise<void>;

  /** Release resources acquired by start(). / 释放 start() 获取的资源。 */
  stop(): void | Promise<void>;
}

export type InfrastructureRuntimeState =
  | "new"
  | "starting"
  | "started"
  | "stopping"
  | "stopped"
  | "failed";

/**
 * A small lifecycle coordinator, not a dependency-injection container.
 * 轻量生命周期协调器，不是依赖注入容器。
 *
 * It does not resolve services, scan modules, read process signals, or own
 * application configuration. The host explicitly registers its resources.
 * 它不负责解析服务、扫描模块、读取进程信号或管理应用配置；
 * 宿主显式注册需要管理的资源。
 */
export class InfrastructureRuntime {
  private readonly resources: InfrastructureResource[] = [];
  private readonly startedResources: InfrastructureResource[] = [];
  private readonly registeredNames = new Set<string>();
  private currentState: InfrastructureRuntimeState = "new";

  get state(): InfrastructureRuntimeState {
    return this.currentState;
  }

  /**
   * Register a process-level resource before startup.
   * 在启动前注册进程级资源。
   */
  register(resource: InfrastructureResource): this {
    if (this.currentState !== "new") {
      throw new Error(
        `Cannot register infrastructure resource "${resource.name}" after startup has begun.`,
      );
    }

    const name = resource.name.trim();
    if (name.length === 0) {
      throw new Error("Infrastructure resource name must not be empty.");
    }

    if (this.registeredNames.has(name)) {
      throw new Error(`Infrastructure resource "${name}" is already registered.`);
    }

    this.registeredNames.add(name);
    this.resources.push(resource);
    return this;
  }

  /**
   * Start all resources in registration order.
   * 按注册顺序启动全部资源。
   *
   * If startup fails, already-started resources are stopped in reverse order.
   * 启动失败时，已成功启动的资源会按相反顺序停止。
   *
   * A resource whose own start() rejects must clean up any partial initialization
   * it performed before rejecting.
   * 资源自身的 start() 如果在部分初始化后失败，必须在抛出异常前清理自身的部分状态。
   */
  async start(): Promise<void> {
    if (this.currentState !== "new") {
      throw new Error(`Cannot start infrastructure runtime from state "${this.currentState}".`);
    }

    this.currentState = "starting";

    try {
      for (const resource of this.resources) {
        await resource.start();
        this.startedResources.push(resource);
      }

      this.currentState = "started";
    } catch (startupError) {
      const cleanupErrors = await this.stopStartedResources();
      this.currentState = cleanupErrors.length === 0 ? "stopped" : "failed";

      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [startupError, ...cleanupErrors],
          "Infrastructure startup failed and one or more resources could not be cleaned up.",
        );
      }

      throw startupError;
    }
  }

  /**
   * Stop started resources in reverse registration order.
   * 按注册顺序的相反顺序停止已启动资源。
   *
   * All stop handlers are attempted even if one fails.
   * 即使某个 stop 失败，也会继续尝试停止其他资源。
   */
  async stop(): Promise<void> {
    if (this.currentState === "stopped") {
      return;
    }

    if (this.currentState === "new") {
      this.currentState = "stopped";
      return;
    }

    if (this.currentState !== "started" && this.currentState !== "failed") {
      throw new Error(`Cannot stop infrastructure runtime from state "${this.currentState}".`);
    }

    this.currentState = "stopping";
    const cleanupErrors = await this.stopStartedResources();
    this.currentState = cleanupErrors.length === 0 ? "stopped" : "failed";

    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        cleanupErrors,
        "One or more infrastructure resources failed to stop.",
      );
    }
  }

  private async stopStartedResources(): Promise<unknown[]> {
    const cleanupErrors: unknown[] = [];

    for (let index = this.startedResources.length - 1; index >= 0; index -= 1) {
      const resource = this.startedResources[index];
      if (resource === undefined) {
        continue;
      }

      try {
        await resource.stop();
        this.startedResources.splice(index, 1);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    return cleanupErrors;
  }
}
