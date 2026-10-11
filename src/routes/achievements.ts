// The trophy cabinet: listAchievements returns every achievement in ACHIEVEMENTS order with when it was
// unlocked, or unlockedAt null while it is still locked. Unlocking happens on the writes that can earn
// one, never on this read.
import { ACHIEVEMENTS } from "../achievements";
import { sql } from "../db";

export async function listAchievements(): Promise<Response> {
  const unlocked = await sql<{ code: string; unlockedAt: Date }[]>`
    SELECT code, unlocked_at AS "unlockedAt" FROM achievements`;
  const unlockedAt = new Map(unlocked.map((row) => [row.code, row.unlockedAt]));
  return Response.json(
    ACHIEVEMENTS.map(({ earned, ...achievement }) => ({
      ...achievement,
      unlockedAt: unlockedAt.get(achievement.code) ?? null,
    })),
  );
}
