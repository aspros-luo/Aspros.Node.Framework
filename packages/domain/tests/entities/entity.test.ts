import {describe,expect,it} from "vitest";
import {Entity} from "../../src/entities/entity.js";
class Customer extends Entity<number>{public constructor(id:number,public name:string){super(id);}}
class Supplier extends Entity<number>{public constructor(id:number){super(id);}}
describe("Entity",()=>{
 it("compares concrete type and ID, not mutable attributes / 按具体类型和 ID 比较，不比较可变属性",()=>{const a=new Customer(7,"A");expect(a.equals(new Customer(7,"B"))).toBe(true);expect(a.equals(new Customer(8,"A"))).toBe(false);expect(a.equals(new Supplier(7))).toBe(false);});
 it("rejects non-finite numeric IDs / 拒绝非有限数值 ID",()=>{expect(()=>new Customer(Number.NaN,"x")).toThrow(TypeError);expect(()=>new Customer(Number.POSITIVE_INFINITY,"x")).toThrow(TypeError);});
});
