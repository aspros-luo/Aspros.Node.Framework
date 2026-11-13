import type {IUnitOfWork} from "../../src/index.js";
/** Demo-only placeholder; it does not provide atomic transactions. / 仅用于演示的占位实现；不提供原子事务。 */
export class InMemoryUnitOfWork implements IUnitOfWork{public async commit():Promise<void>{/* No external transaction in this demo. / 本示例没有外部事务。 */}public async rollback():Promise<void>{/* Real adapters must discard their context. / 真实适配器必须丢弃持久化上下文。 */}}
