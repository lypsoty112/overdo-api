# overdo-api

The HTTP API behind **Overdo**, the to-do list that does far too much. Bun, raw SQL through
`postgres`, zod for request bodies. The schema lives in `overdo-db`; the UI in `overdo-web`.

## Run it

```bash
bun install
bun run dev        # http://localhost:3700, hot reload
```

`DATABASE_URL` defaults to overdo-db's local Postgres (`postgres://overdo:overdo@localhost:5433/overdo`).
Run `bun run migrate` in `overdo-db` first.

## Routes

| Method | Path | Does |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/tasks` | Every live task, with its subtasks and tags |
| POST | `/tasks` | Create a task (`title`, optional `notes`, `priority` 1–4, `energy`, `dueOn`) |
| PATCH | `/tasks/:id` | Update any task field, including `status` (`todo` / `doing` / `done`) |
| DELETE | `/tasks/:id` | Soft-delete a task |
| POST | `/tasks/:id/subtasks` | Add a subtask (`title`) |
| PATCH | `/subtasks/:id` | Rename or toggle a subtask (`title`, `done`) |
| DELETE | `/subtasks/:id` | Delete a subtask |
| GET | `/tags` | Every tag ever used |
| POST | `/tasks/:id/tags` | Tag a task (`name`); creates the tag on first use |
| DELETE | `/tasks/:id/tags/:tagId` | Untag a task |
