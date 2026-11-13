import type {IRepository} from "../../src/index.js";
import type {Trade} from "./trade.js";
/** Business-specific repository contract. / 业务专属仓储契约。 */
export interface ITradeRepository extends IRepository<Trade,number>{}
/** Demo-only memory adapter; production persistence belongs to Infrastructure. / 仅用于演示的内存适配器；生产持久化属于 Infrastructure。 */
export class InMemoryTradeRepository implements ITradeRepository{private readonly trades=new Map<number,Trade>();public async findById(id:number):Promise<Trade|null>{return this.trades.get(id)??null;}public async save(trade:Trade):Promise<void>{this.trades.set(trade.id,trade);}}
