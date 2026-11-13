/** Reusable in-memory domain predicate. / 可复用的内存领域判断条件。 */
export interface ISpecification<T>{isSatisfiedBy(candidate:T):boolean;and(other:ISpecification<T>):ISpecification<T>;or(other:ISpecification<T>):ISpecification<T>;not():ISpecification<T>;}
/** Composable specification base. / 可组合规约基类。 */
export abstract class Specification<T> implements ISpecification<T>{
 public abstract isSatisfiedBy(candidate:T):boolean;
 public and(other:ISpecification<T>):ISpecification<T>{return new PredicateSpecification(x=>this.isSatisfiedBy(x)&&other.isSatisfiedBy(x));}
 public or(other:ISpecification<T>):ISpecification<T>{return new PredicateSpecification(x=>this.isSatisfiedBy(x)||other.isSatisfiedBy(x));}
 public not():ISpecification<T>{return new PredicateSpecification(x=>!this.isSatisfiedBy(x));}
}
class PredicateSpecification<T> extends Specification<T>{public constructor(private readonly predicate:(candidate:T)=>boolean){super();}public isSatisfiedBy(candidate:T):boolean{return this.predicate(candidate);}}
