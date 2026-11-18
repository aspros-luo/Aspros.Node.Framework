import { describe, expect, it } from "vitest";
import { AggregateRoot } from "../../src/entities/aggregate-root.js";
import { aggregateRootBrand } from "../../src/entities/entity-id.js";
import type { IAggregateRoot } from "../../src/entities/entity-id.js";
import type { DomainEvent } from "../../src/events/domain-event.js";

class TestAggregate extends AggregateRoot<number> {
  public constructor() {
    super(1);
  }

  public raise(event: DomainEvent): void {
    this.addDomainEvent(event);
  }
}

class CustomAggregate implements IAggregateRoot<number> {
  public readonly id = 2;
  public readonly [aggregateRootBrand] = true as const;
}

const event: DomainEvent = {
  eventId: "evt-1",
  eventType: "test.raised",
  occurredAt: new Date("2026-01-01T00:00:00Z"),
  eventVersion: 1,
};

describe("AggregateRoot", () => {
  it("allows a custom root without base-class inheritance / 允许不继承基类的自定义聚合根", () => {
    const aggregate = new CustomAggregate();

    expect(aggregate[aggregateRootBrand]).toBe(true);
  });

  it("provides an explicit aggregate-root marker / 提供明确的聚合根标记", () => {
    const aggregate = new TestAggregate();

    expect(aggregate[aggregateRootBrand]).toBe(true);
  });

  it("records events and returns a snapshot / 记录事件并返回快照", () => {
    const aggregate = new TestAggregate();

    aggregate.raise(event);
    const snapshot = aggregate.domainEvents;

    expect(snapshot).toEqual([event]);
    expect(snapshot).not.toBe(aggregate.domainEvents);
  });

  it("clears events explicitly / 显式清空事件", () => {
    const aggregate = new TestAggregate();

    aggregate.raise(event);
    aggregate.clearDomainEvents();

    expect(aggregate.domainEvents).toHaveLength(0);
  });
});
