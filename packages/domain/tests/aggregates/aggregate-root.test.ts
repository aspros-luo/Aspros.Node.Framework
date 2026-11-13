import {describe,expect,it} from "vitest";
import {AggregateRoot} from "../../src/entities/aggregate-root.js";
import {aggregateRootBrand} from "../../src/entities/entity-id.js";
import type {DomainEvent} from "../../src/events/domain-event.js";
class TestAggregate extends AggregateRoot<number>{public constructor(){super(1);}public raise(e:DomainEvent){this.addDomainEvent(e);}}
const event:DomainEvent={eventId:"evt-1",eventType:"test.raised",occurredAt:new Date("2026-01-01T00:00:00Z"),eventVersion:1};
describe("AggregateRoot",()=>{
 it("provides an explicit aggregate-root marker / 提供明确的聚合根标记",()=>{const a=new TestAggregate();expect(a[aggregateRootBrand]).toBe(true);});
 it("records events and returns a snapshot / 记录事件并返回快照",()=>{const a=new TestAggregate();a.raise(event);const snapshot=a.domainEvents;expect(snapshot).toEqual([event]);expect(snapshot).not.toBe(a.domainEvents);});
 it("clears events explicitly / 显式清空事件",()=>{const a=new TestAggregate();a.raise(event);a.clearDomainEvents();expect(a.domainEvents).toHaveLength(0);});
});
