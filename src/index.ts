// Overdo's HTTP API: a Bun.serve route table (the same shape as echo-api's src/index.ts) mapping each
// path and method to a handler in routes/. The error handler turns Postgres rejecting a malformed id
// into a 400 rather than a 500; anything else is logged and returned as a 500.
import postgres from "postgres";
import { createSubtask, deleteSubtask, updateSubtask } from "./routes/subtasks";
import { addTag, listTags, removeTag } from "./routes/tags";
import { createTask, deleteTask, listTasks, updateTask } from "./routes/tasks";

const port = Number(process.env.PORT ?? 3700);

Bun.serve({
  port,
  routes: {
    "/health": Response.json({ status: "ok" }),
    "/tasks": {
      GET: () => listTasks(),
      POST: (req) => createTask(req),
    },
    "/tasks/:id": {
      PATCH: (req) => updateTask(req, req.params.id),
      DELETE: (req) => deleteTask(req.params.id),
    },
    "/tasks/:id/subtasks": {
      POST: (req) => createSubtask(req, req.params.id),
    },
    "/subtasks/:id": {
      PATCH: (req) => updateSubtask(req, req.params.id),
      DELETE: (req) => deleteSubtask(req.params.id),
    },
    "/tags": {
      GET: () => listTags(),
    },
    "/tasks/:id/tags": {
      POST: (req) => addTag(req, req.params.id),
    },
    "/tasks/:id/tags/:tagId": {
      DELETE: (req) => removeTag(req.params.id, req.params.tagId),
    },
  },
  fetch() {
    return Response.json({ error: "Not found" }, { status: 404 });
  },
  error(err) {
    if (err instanceof postgres.PostgresError && err.code === "22P02") {
      return Response.json({ error: "Malformed id" }, { status: 400 });
    }
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  },
});

console.log(`overdo-api listening on http://localhost:${port}`);
