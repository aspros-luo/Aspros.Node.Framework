/** Marker contract for domain services. / 领域服务标记契约。
 * Services express domain rules and must not perform infrastructure I/O.
 * 领域服务表达领域规则，不应执行基础设施 I/O。
 * Method shapes are defined by each business domain. / 方法由具体业务领域定义。
 */
export interface IDomainService {}
