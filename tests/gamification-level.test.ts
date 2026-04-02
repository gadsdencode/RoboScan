import { describe, expect, it } from "vitest";
import { calculateLevel } from "../shared/gamification.js";

/**
 * Mirrors PostgreSQL: (floor(sqrt(((xp + delta)::numeric / 100))) + 1)::int
 * using the post-update total XP (old_xp + delta).
 */
function levelAfterIncrement(oldXp: number, delta: number): number {
  const totalXp = oldXp + delta;
  return calculateLevel(totalXp);
}

describe("calculateLevel", () => {
  it("matches documented boundaries for total XP", () => {
    const cases: [number, number][] = [
      [0, 1],
      [99, 1],
      [100, 2],
      [399, 2],
      [400, 3],
      [10_000, 11],
    ];
    for (const [totalXp, expectedLevel] of cases) {
      expect(calculateLevel(totalXp)).toBe(expectedLevel);
    }
  });

  it("matches incremental levelAfterIncrement for random deltas", () => {
    for (const oldXp of [0, 10, 99, 100, 5000, 99999]) {
      for (const delta of [1, 5, 10, 50, 100, 1000]) {
        const total = oldXp + delta;
        expect(levelAfterIncrement(oldXp, delta)).toBe(calculateLevel(total));
      }
    }
  });
});
