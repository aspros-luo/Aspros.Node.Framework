/** Typed business-rule error base. / 类型化业务规则错误基类。
 * Stable codes support programmatic handling; messages may be localized.
 * 稳定 code 用于程序化处理；message 可以本地化。
 */
export abstract class DomainError extends Error {
  public readonly code:string;
  protected constructor(message:string,code:string,options?:ErrorOptions){super(message,options);this.name=new.target.name;this.code=code;}
}
