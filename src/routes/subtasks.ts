// Subtasks under a task: createSubtask, updateSubtask (rename or toggle) and deleteSubtask. A subtask
// has no soft delete of its own; it is removed outright, and cascades away with a hard-deleted task.
import { z } from "zod";
import { sql } from "../db";
import { notFound, parseBody } from "../http";
import { liveTaskExists } from "./tasks";

const title = z.string().trim().min(1, "must be a non-empty string");
const createSchema = z.object({ title });
const updateSchema = z
  .object({ title, done: z.boolean() })
  .partial()
  .refine((body) => Object.keys(body).length > 0, "nothing to update");

export async function createSubtask(req: Request, taskId: string): Promise<Response> {
  const parsed = await parseBody(req, createSchema);
  if ("response" in parsed) return parsed.response;
  if (!(await liveTaskExists(taskId))) return notFound("task");

  const [subtask] = await sql`
    INSERT INTO subtasks (task_id, title) VALUES (${taskId}, ${parsed.data.title})
    RETURNING id, title, done`;
  return Response.json(subtask, { status: 201 });
}

export async function updateSubtask(req: Request, id: string): Promise<Response> {
  const parsed = await parseBody(req, updateSchema);
  if ("response" in parsed) return parsed.response;

  const [subtask] = await sql`
    UPDATE subtasks SET ${sql(parsed.data)} WHERE id = ${id} RETURNING id, title, done`;
  return subtask ? Response.json(subtask) : notFound("subtask");
}

export async function deleteSubtask(id: string): Promise<Response> {
  const deleted = await sql`DELETE FROM subtasks WHERE id = ${id} RETURNING id`;
  return deleted.length ? new Response(null, { status: 204 }) : notFound("subtask");
}
