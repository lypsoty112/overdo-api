// Mood check-ins: logMood records how someone feels, optionally blaming a specific task for it.
import { z } from "zod";
import { sql } from "../db";
import { notFound, parseBody } from "../http";
import { liveTaskExists } from "./tasks";

const logSchema = z.object({
  mood: z.enum(["ecstatic", "fine", "meh", "drained", "feral"]),
  taskId: z.uuid().nullable().optional(),
});

export async function logMood(req: Request): Promise<Response> {
  const parsed = await parseBody(req, logSchema);
  if ("response" in parsed) return parsed.response;
  const { mood, taskId = null } = parsed.data;
  if (taskId && !(await liveTaskExists(taskId))) return notFound("task");

  const [log] = await sql`
    INSERT INTO mood_logs (mood, task_id) VALUES (${mood}, ${taskId})
    RETURNING id, mood, task_id AS "taskId", logged_at AS "loggedAt"`;
  return Response.json(log, { status: 201 });
}
