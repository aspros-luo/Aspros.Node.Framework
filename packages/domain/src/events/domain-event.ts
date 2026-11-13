/** A fact that has already happened in the domain. / 领域中已经发生的事实。
 * IDs and timestamps are supplied by callers, not runtime globals.
 * 标识符和时间由调用方提供，不从 Runtime 全局对象获取。
 */
export interface DomainEvent { readonly eventId:string; readonly eventType:string; readonly occurredAt:Date; readonly eventVersion:number; }
