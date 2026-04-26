import { describe, expect, it } from "vitest";
import { computeMoveDelta } from "../movement";

describe("computeMoveDelta", () => {
  it("no keys → zero delta", () => {
    expect(computeMoveDelta(new Set(), 4)).toEqual({ dx: 0, dy: 0 });
  });

  it("W → move up", () => {
    expect(computeMoveDelta(new Set(["w"]), 4)).toEqual({ dx: 0, dy: -4 });
  });

  it("S → move down", () => {
    expect(computeMoveDelta(new Set(["s"]), 4)).toEqual({ dx: 0, dy: 4 });
  });

  it("A → move left", () => {
    expect(computeMoveDelta(new Set(["a"]), 4)).toEqual({ dx: -4, dy: 0 });
  });

  it("D → move right", () => {
    expect(computeMoveDelta(new Set(["d"]), 4)).toEqual({ dx: 4, dy: 0 });
  });

  it("ArrowUp → move up", () => {
    expect(computeMoveDelta(new Set(["ArrowUp"]), 4)).toEqual({
      dx: 0,
      dy: -4,
    });
  });

  it("ArrowDown → move down", () => {
    expect(computeMoveDelta(new Set(["ArrowDown"]), 4)).toEqual({
      dx: 0,
      dy: 4,
    });
  });

  it("ArrowLeft → move left", () => {
    expect(computeMoveDelta(new Set(["ArrowLeft"]), 4)).toEqual({
      dx: -4,
      dy: 0,
    });
  });

  it("ArrowRight → move right", () => {
    expect(computeMoveDelta(new Set(["ArrowRight"]), 4)).toEqual({
      dx: 4,
      dy: 0,
    });
  });

  it("S+D → diagonal down-right", () => {
    expect(computeMoveDelta(new Set(["s", "d"]), 4)).toEqual({ dx: 4, dy: 4 });
  });

  it("W+A → diagonal up-left", () => {
    expect(computeMoveDelta(new Set(["w", "a"]), 4)).toEqual({
      dx: -4,
      dy: -4,
    });
  });

  it("opposite keys cancel out", () => {
    expect(computeMoveDelta(new Set(["w", "s"]), 4)).toEqual({ dx: 0, dy: 0 });
    expect(computeMoveDelta(new Set(["a", "d"]), 4)).toEqual({ dx: 0, dy: 0 });
  });
});
