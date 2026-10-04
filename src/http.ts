// Helpers every route shares: parseBody validates a JSON body against a zod schema and turns the first
// issue into a 400 (the same contract as echo-api's lib/validate.ts), notFound is the 404 for a missing id.
import type { z } from "zod";

export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.output<S> } | { response: Response }> {
  const parsed = schema.safeParse(await req.json().catch(() => undefined));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error = issue ? [...issue.path, issue.message].join(" ") : "Invalid body";
    return { response: Response.json({ error }, { status: 400 }) };
  }
  return { data: parsed.data };
}

export function notFound(what: string): Response {
  return Response.json({ error: `${what} not found` }, { status: 404 });
}
