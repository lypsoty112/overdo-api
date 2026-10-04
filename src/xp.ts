// The XP rules. completionPoints prices a finished task (urgent and draining tasks pay more; "chaotic"
// energy rolls a random bonus), awardXp appends a row to the xp_events ledger, revokeCompletion writes
// the negative of a task's last completion and any boss bonus paid with it when the task is reopened,
// and levelFor turns a running total into a level where each level costs 100 XP more than the last.
import { sql } from "./db";

const ENERGY_BONUS: Record<string, number> = { low: 0, medium: 5, high: 10 };

export function completionPoints(priority: number, energy: string): number {
  const bonus = energy === "chaotic" ? Math.floor(Math.random() * 31) : (ENERGY_BONUS[energy] ?? 0);
  return 10 + (4 - priority) * 5 + bonus;
}

export async function awardXp(
  taskId: string,
  reason: "completed" | "focus" | "boss_defeated",
  points: number,
): Promise<void> {
  await sql`INSERT INTO xp_events (task_id, reason, points) VALUES (${taskId}, ${reason}, ${points})`;
}

export async function revokeCompletion(taskId: string): Promise<void> {
  await sql`
    INSERT INTO xp_events (task_id, reason, points)
    SELECT task_id, 'uncompleted', -points FROM xp_events
    WHERE task_id = ${taskId}
      AND reason IN ('completed', 'boss_defeated')
      AND created_at >= (
        SELECT max(created_at) FROM xp_events WHERE task_id = ${taskId} AND reason = 'completed'
      )`;
}

export function levelFor(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number } {
  let level = 1;
  while (50 * (level + 1) * level <= xp) level++;
  return { level, xpIntoLevel: xp - 50 * level * (level - 1), xpForNextLevel: 100 * level };
}
