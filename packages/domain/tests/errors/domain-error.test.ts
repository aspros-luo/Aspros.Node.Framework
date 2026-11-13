import {describe,expect,it} from "vitest";
import {DomainError} from "../../src/errors/domain-error.js";
class RuleError extends DomainError{public constructor(cause?:unknown){super("Rule failed","RULE_FAILED",{cause});}}
describe("DomainError",()=>{it("keeps stable code and cause / 保留稳定代码和 cause",()=>{const cause=new Error("inner");const e=new RuleError(cause);expect(e).toBeInstanceOf(Error);expect(e.code).toBe("RULE_FAILED");expect(e.cause).toBe(cause);expect(e.name).toBe("RuleError");});});
