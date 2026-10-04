// Task CRUD: listTasks, createTask, updateTask and deleteTask. Every response goes through selectTasks,
// so all four return the same camelCase shape, subtasks and tags folded in as JSON arrays. toColumns maps
// a validated body onto snake_case columns, dropping absent fields so a PATCH only touches what it names.
// Deletes are soft (deleted_at); liveTaskExists is the check other routes run before writing to a task.
// Moving a task into or out of "done" stamps completed_at and pays or claws back its XP, plus the boss
// bonus when the task is a P1 boss.
import type postgres from "postgres";
import { z } from "zod";
import { BOSS_BONUS, bossFor } from "../bosses";
import { sql } from "../db";
import { notFound, parseBody } from "../http";
import { awardXp, completionPoints, revokeCompletion } from "../xp";

const fields = z.object({
  title: z.string().trim().min(1, "must be a non-empty string"),
  notes: z.string(),
  status: z.enum(["todo", "doing", "done"]),
  priority: z.number().int().min(1).max(4),
  energy: z.enum(["low", "medium", "high", "chaotic"]),
  dueOn: z.iso.date().nullable(),
});

const createSchema = fields.partial().required({ title: true });
const updateSchema = fields.partial().refine((body) => Object.keys(body).length > 0, "nothing to update");

type TaskInput = z.output<typeof updateSchema>;
type TaskRow = postgres.Row & {
  id: string;
  status: string;
  priority: number;
  energy: string;
  subtasks: { done: boolean }[];
};

function toColumns(body: TaskInput): Record<string, unknown> {
  const columns = {
    title: body.title,
    notes: body.notes,
    status: body.status,
    priority: body.priority,
    energy: body.energy,
    due_on: body.dueOn,
  };
  return Object.fromEntries(Object.entries(columns).filter(([, value]) => value !== undefined));
}

async function selectTasks(where: postgres.Fragment) {
  const rows = await sql<TaskRow[]>`
    SELECT t.id, t.title, t.notes, t.status, t.priority, t.energy,
      to_char(t.due_on, 'YYYY-MM-DD') AS "dueOn",
      t.created_at AS "createdAt",
      t.completed_at AS "completedAt",
      COALESCE((
        SELECT json_agg(json_build_object('id', s.id, 'title', s.title, 'done', s.done) ORDER BY s.created_at)
        FROM subtasks s WHERE s.task_id = t.id
      ), '[]') AS subtasks,
      COALESCE((
        SELECT json_agg(json_build_object('id', g.id, 'name', g.name, 'color', g.color) ORDER BY g.name)
        FROM task_tags tt JOIN tags g ON g.id = tt.tag_id WHERE tt.task_id = t.id
      ), '[]') AS tags
    FROM tasks t
    WHERE t.deleted_at IS NULL AND ${where}
    ORDER BY t.created_at`;
  return rows.map((task) => ({ ...task, boss: bossFor(task) }));
}

export async function liveTaskExists(id: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM tasks WHERE id = ${id} AND deleted_at IS NULL`;
  return rows.length > 0;
}

export async function listTasks(): Promise<Response> {
  return Response.json(await selectTasks(sql`true`));
}

export async function createTask(req: Request): Promise<Response> {
  const parsed = await parseBody(req, createSchema);
  if ("response" in parsed) return parsed.response;

  const [created] = await sql<{ id: string }[]>`
    INSERT INTO tasks ${sql(toColumns(parsed.data))} RETURNING id`;
  const [task] = await selectTasks(sql`t.id = ${created?.id ?? null}`);
  return Response.json(task, { status: 201 });
}

export async function updateTask(req: Request, id: string): Promise<Response> {
  const parsed = await parseBody(req, updateSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;

  const [before] = await sql<{ status: string }[]>`
    SELECT status FROM tasks WHERE id = ${id} AND deleted_at IS NULL`;
  if (!before) return notFound("task");

  const completing = body.status === "done" && before.status !== "done";
  const reopening = body.status !== undefined && body.status !== "done" && before.status === "done";
  const columns = toColumns(body);
  if (completing) columns.completed_at = new Date();
  if (reopening) columns.completed_at = null;

  await sql`UPDATE tasks SET ${sql(columns)} WHERE id = ${id}`;
  const [task] = await selectTasks(sql`t.id = ${id}`);
  if (completing && task) await awardXp(id, "completed", completionPoints(task.priority, task.energy));
  if (completing && task?.boss) await awardXp(id, "boss_defeated", BOSS_BONUS);
  if (reopening) await revokeCompletion(id);
  return Response.json(task);
}

export async function deleteTask(id: string): Promise<Response> {
  const deleted = await sql`
    UPDATE tasks SET deleted_at = now() WHERE id = ${id} AND deleted_at IS NULL RETURNING id`;
  return deleted.length ? new Response(null, { status: 204 }) : notFound("task");
}
