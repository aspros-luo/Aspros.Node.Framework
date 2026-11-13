import {describe,expect,it} from "vitest";
import {Specification} from "../../src/specifications/specification.js";
class Positive extends Specification<number>{public isSatisfiedBy(n:number){return n>0;}}
class Even extends Specification<number>{public isSatisfiedBy(n:number){return n%2===0;}}
describe("Specification",()=>{it("composes AND, OR and NOT / 组合 AND、OR、NOT",()=>{const p=new Positive();const e=new Even();expect(p.and(e).isSatisfiedBy(4)).toBe(true);expect(p.and(e).isSatisfiedBy(3)).toBe(false);expect(p.or(e).isSatisfiedBy(-2)).toBe(true);expect(p.not().isSatisfiedBy(-1)).toBe(true);});});
