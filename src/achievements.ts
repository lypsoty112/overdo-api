// Achievements: ACHIEVEMENTS lists every one Overdo awards, each with an `earned` condition written as a
// SQL fragment over data the app already keeps, and unlockAchievements records every condition that now
// holds. Unlocks are permanent, so reopening or deleting a task never takes one back, and history from
// before an achievement existed still counts. A soft-deleted task still counts as finished, the same way
// it still explains its XP events. Times are Postgres times, the clock stats.ts counts days by.
import type postgres from "postgres";
import { sql } from "./db";

interface Achievement {
  code: string;
  emoji: string;
  title: string;
  description: string;
  earned: () => postgres.Fragment;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    code: "first_blood",
    emoji: "🩸",
    title: "First blood",
    description: "Complete a task",
    earned: () => sql`EXISTS (SELECT 1 FROM tasks WHERE completed_at IS NOT NULL)`,
  },
  {
    code: "early_bird",
    emoji: "🐦",
    title: "Early bird",
    description: "Finish a P1 before noon",
    earned: () => sql`EXISTS (SELECT 1 FROM tasks WHERE priority = 1 AND completed_at::time < '12:00')`,
  },
  {
    code: "boss_slayer",
    emoji: "⚔️",
    title: "Boss slayer",
    description: "Defeat three bosses",
    earned: () => sql`(SELECT count(*) FROM tasks WHERE priority = 1 AND completed_at IS NOT NULL) >= 3`,
  },
  {
    code: "hat_trick",
    emoji: "🎩",
    title: "Hat trick",
    description: "Complete three tasks in one day",
    earned: () => sql`EXISTS (
      SELECT 1 FROM tasks WHERE completed_at IS NOT NULL GROUP BY completed_at::date HAVING count(*) >= 3)`,
  },
  {
    code: "night_owl",
    emoji: "🦉",
    title: "Night owl",
    description: "Complete a task between midnight and 5 a.m.",
    earned: () => sql`EXISTS (SELECT 1 FROM tasks WHERE completed_at::time < '05:00')`,
  },
  {
    code: "fashionably_late",
    emoji: "🐌",
    title: "Fashionably late",
    description: "Complete a task a week after it was due",
    earned: () => sql`EXISTS (SELECT 1 FROM tasks WHERE completed_at::date - due_on >= 7)`,
  },
  {
    code: "tomato_farmer",
    emoji: "🍅",
    title: "Tomato farmer",
    description: "Finish four focus sessions in one day",
    earned: () => sql`EXISTS (
      SELECT 1 FROM pomodoro_sessions
      WHERE ended_at - started_at >= make_interval(mins => planned_minutes)
      GROUP BY ended_at::date HAVING count(*) >= 4)`,
  },
  {
    code: "unleashed",
    emoji: "🐺",
    title: "Unleashed",
    description: "Log a feral mood",
    earned: () => sql`EXISTS (SELECT 1 FROM mood_logs WHERE mood = 'feral')`,
  },
];

export async function unlockAchievements(): Promise<void> {
  for (const { code, earned } of ACHIEVEMENTS) {
    await sql`INSERT INTO achievements (code) SELECT ${code} WHERE ${earned()} ON CONFLICT (code) DO NOTHING`;
  }
}
