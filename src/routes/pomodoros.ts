// Focus sessions: startPomodoro, currentPomodoro and stopPomodoro. Only one session runs at a time, so
// starting one stops any other and moves its task to "doing". Stopping a session that lasted its full
// planned length pays one XP per planned minute; stopping early pays nothing.
import { z } from "zod";
import { sql } from "../db";
import { notFound, parseBody } from "../http";
import { awardXp } from "../xp";
import { liveTaskExists } from "./tasks";

const startSchema = z.object({ minutes: z.number().int().min(1).max(180).optional() });

function sessionColumns() {
  return sql`id, task_id AS "taskId", planned_minutes AS "plannedMinutes",
    started_at AS "startedAt", ended_at AS "endedAt"`;
}

export async function startPomodoro(req: Request, taskId: string): Promise<Response> {
  const parsed = await parseBody(req, startSchema);
  if ("response" in parsed) return parsed.response;
  if (!(await liveTaskExists(taskId))) return notFound("task");

  await sql`UPDATE pomodoro_sessions SET ended_at = now() WHERE ended_at IS NULL`;
  await sql`UPDATE tasks SET status = 'doing' WHERE id = ${taskId} AND status = 'todo'`;
  const [session] = await sql`
    INSERT INTO pomodoro_sessions (task_id, planned_minutes)
    VALUES (${taskId}, ${parsed.data.minutes ?? 25})
    RETURNING ${sessionColumns()}`;
  return Response.json(session, { status: 201 });
}

export async function currentPomodoro(): Promise<Response> {
  const [session] = await sql`
    SELECT ${sessionColumns()} FROM pomodoro_sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1`;
  return Response.json(session ?? null);
}

export async function stopPomodoro(id: string): Promise<Response> {
  const [session] = await sql`
    UPDATE pomodoro_sessions SET ended_at = now()
    WHERE id = ${id} AND ended_at IS NULL
    RETURNING ${sessionColumns()}, ended_at - started_at >= make_interval(mins => planned_minutes) AS finished`;
  if (!session) return notFound("running session");

  if (session.finished) await awardXp(session.taskId, "focus", session.plannedMinutes);
  return Response.json(session);
}
