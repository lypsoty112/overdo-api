// Tags shared across tasks: listTags, addTag (creates the tag on first use, then links it) and
// removeTag (unlinks only; the tag stays for the next task). colorFor derives a tag's color from its
// name, so the same word gets the same color without anyone picking one.
import { z } from "zod";
import { sql } from "../db";
import { notFound, parseBody } from "../http";
import { liveTaskExists } from "./tasks";

const PALETTE = ["#b83f45", "#c47b2b", "#5a8f3e", "#3f7cb8", "#8a4fb8", "#4d4d4d"];
const addSchema = z.object({ name: z.string().trim().toLowerCase().min(1).max(24) });

function colorFor(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length] ?? "#4d4d4d";
}

export async function listTags(): Promise<Response> {
  return Response.json(await sql`SELECT id, name, color FROM tags ORDER BY name`);
}

export async function addTag(req: Request, taskId: string): Promise<Response> {
  const parsed = await parseBody(req, addSchema);
  if ("response" in parsed) return parsed.response;
  if (!(await liveTaskExists(taskId))) return notFound("task");

  const { name } = parsed.data;
  const [tag] = await sql<{ id: string; name: string; color: string }[]>`
    INSERT INTO tags (name, color) VALUES (${name}, ${colorFor(name)})
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name, color`;
  await sql`INSERT INTO task_tags (task_id, tag_id) VALUES (${taskId}, ${tag?.id ?? null}) ON CONFLICT DO NOTHING`;
  return Response.json(tag, { status: 201 });
}

export async function removeTag(taskId: string, tagId: string): Promise<Response> {
  const removed = await sql`
    DELETE FROM task_tags WHERE task_id = ${taskId} AND tag_id = ${tagId} RETURNING tag_id`;
  return removed.length ? new Response(null, { status: 204 }) : notFound("tag on task");
}
