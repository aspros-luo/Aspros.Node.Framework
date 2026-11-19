import { describe, expect, it, vi } from "vitest";
import {
  InfrastructureRuntime,
  type InfrastructureResource,
} from "../../src/index.js";

function createResource(
  name: string,
  start: InfrastructureResource["start"] = vi.fn(),
  stop: InfrastructureResource["stop"] = vi.fn(),
): InfrastructureResource {
  return { name, start, stop };
}

describe("InfrastructureRuntime", () => {
  it("starts in registration order and stops in reverse order", async () => {
    const calls: string[] = [];
    const runtime = new InfrastructureRuntime();

    runtime
      .register(createResource("database", () => calls.push("start:database"), () => calls.push("stop:database")))
      .register(createResource("cache", () => calls.push("start:cache"), () => calls.push("stop:cache")))
      .register(createResource("broker", () => calls.push("start:broker"), () => calls.push("stop:broker")));

    await runtime.start();
    expect(runtime.state).toBe("started");

    await runtime.stop();
    await runtime.stop();
    expect(runtime.state).toBe("stopped");
    expect(calls).toEqual([
      "start:database",
      "start:cache",
      "start:broker",
      "stop:broker",
      "stop:cache",
      "stop:database",
    ]);
  });

  it("rolls back already-started resources when a later start fails", async () => {
    const calls: string[] = [];
    const startupError = new Error("cache unavailable");
    const runtime = new InfrastructureRuntime();

    runtime
      .register(createResource("database", () => calls.push("start:database"), () => calls.push("stop:database")))
      .register(createResource("cache", () => { throw startupError; }))
      .register(createResource("broker", () => calls.push("start:broker"), () => calls.push("stop:broker")));

    await expect(runtime.start()).rejects.toBe(startupError);
    expect(runtime.state).toBe("stopped");
    expect(calls).toEqual(["start:database", "stop:database"]);
  });

  it("continues stopping resources when one stop handler fails", async () => {
    const calls: string[] = [];
    const stopError = new Error("cache close failed");
    const runtime = new InfrastructureRuntime();

    runtime
      .register(createResource("database", () => calls.push("start:database"), () => calls.push("stop:database")))
      .register(createResource("cache", () => calls.push("start:cache"), () => {
        calls.push("stop:cache");
        throw stopError;
      }))
      .register(createResource("broker", () => calls.push("start:broker"), () => calls.push("stop:broker")));

    await runtime.start();
    await expect(runtime.stop()).rejects.toMatchObject({
      errors: [stopError],
    });

    expect(runtime.state).toBe("failed");
    expect(calls).toEqual([
      "start:database",
      "start:cache",
      "start:broker",
      "stop:broker",
      "stop:cache",
      "stop:database",
    ]);

    await runtime.stop();
    expect(runtime.state).toBe("stopped");
  });

  it("rejects duplicate names and registration after startup", async () => {
    const runtime = new InfrastructureRuntime();
    runtime.register(createResource("database"));

    expect(() => runtime.register(createResource("database"))).toThrow(/already registered/);

    await runtime.start();
    expect(() => runtime.register(createResource("cache"))).toThrow(/after startup/);
    await runtime.stop();
  });

  it("rejects invalid lifecycle transitions", async () => {
    const runtime = new InfrastructureRuntime();

    await runtime.stop();
    expect(runtime.state).toBe("stopped");
    await expect(runtime.start()).rejects.toThrow(/Cannot start/);
    await expect(runtime.start()).rejects.toThrow(/Cannot start/);
  });

  it("rejects blank and non-canonical resource names", () => {
    const runtime = new InfrastructureRuntime();
    expect(() => runtime.register(createResource("  "))).toThrow(/must not be empty/);
    expect(() => runtime.register(createResource(" database "))).toThrow(/surrounding whitespace/);
  });
});
