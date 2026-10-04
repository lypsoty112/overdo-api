// The dashboard numbers: getStats sums the XP ledger into a level, counts the completion streak, and
// computes today's totals plus a "procrastination index" (average age of open tasks, plus a penalty per
// overdue one, capped at 100). Days are Postgres days, so the streak and "today" never disagree.
import { sql } from "../db";
import { levelFor } from "../xp";

function streakFrom(ages: number[]): number {
  const start = ages[0] === 0 ? 0 : 1;
  let streak = 0;
  while (ages[streak] === start + streak) streak++;
  return streak;
}

export async function getStats(): Promise<Response> {
  const [totals] = await sql<
    {
      xp: number;
      completedToday: number;
      focusMinutesToday: number;
      moodOfTheDay: string | null;
      openAgeDays: number;
      overdue: number;
    }[]
  >`
    SELECT
      (SELECT COALESCE(sum(points), 0)::int FROM xp_events) AS xp,
      (SELECT count(*)::int FROM tasks
        WHERE deleted_at IS NULL AND completed_at >= current_date) AS "completedToday",
      (SELECT COALESCE(sum(planned_minutes), 0)::int FROM pomodoro_sessions
        WHERE ended_at >= current_date
          AND ended_at - started_at >= make_interval(mins => planned_minutes)) AS "focusMinutesToday",
      (SELECT mood FROM mood_logs WHERE logged_at >= current_date
        GROUP BY mood ORDER BY count(*) DESC, max(logged_at) DESC LIMIT 1) AS "moodOfTheDay",
      (SELECT COALESCE(avg(extract(epoch FROM now() - created_at) / 86400), 0)::float FROM tasks
        WHERE deleted_at IS NULL AND status <> 'done') AS "openAgeDays",
      (SELECT count(*)::int FROM tasks
        WHERE deleted_at IS NULL AND status <> 'done' AND due_on < current_date) AS overdue`;

  const completionAges = await sql<{ age: number }[]>`
    SELECT DISTINCT current_date - completed_at::date AS age FROM tasks
    WHERE deleted_at IS NULL AND completed_at IS NOT NULL
    ORDER BY age`;

  if (!totals) throw new Error("stats query returned no row");
  const { xp, openAgeDays, overdue, ...today } = totals;
  return Response.json({
    xp,
    ...levelFor(xp),
    streakDays: streakFrom(completionAges.map((row) => row.age)),
    ...today,
    procrastinationIndex: Math.min(100, Math.round(openAgeDays * 5 + overdue * 10)),
  });
}
