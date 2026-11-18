import { describe, expect, it } from "vitest";
import { Specification } from "../../src/specifications/specification.js";

class Positive extends Specification<number> {
  public isSatisfiedBy(value: number): boolean {
    return value > 0;
  }
}

class Even extends Specification<number> {
  public isSatisfiedBy(value: number): boolean {
    return value % 2 === 0;
  }
}

describe("Specification", () => {
  it("composes AND, OR and NOT / 组合 AND、OR、NOT", () => {
    const positive = new Positive();
    const even = new Even();

    expect(positive.and(even).isSatisfiedBy(4)).toBe(true);
    expect(positive.and(even).isSatisfiedBy(3)).toBe(false);
    expect(positive.or(even).isSatisfiedBy(-2)).toBe(true);
    expect(positive.not().isSatisfiedBy(-1)).toBe(true);
  });
});
