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
| POST | `/tasks/:id/pomodoros` | Start a focus session (`minutes`, default 25); stops any other and moves the task to `doing` |
| GET | `/pomodoros/current` | The running session, or `null` |
| POST | `/pomodoros/:id/stop` | Stop a session; a full-length one pays 1 XP per minute |
| POST | `/moods` | Log a mood (`ecstatic` / `fine` / `meh` / `drained` / `feral`, optional `taskId`) |
| GET | `/stats` | XP, level, streak, today's totals and the procrastination index |
| GET | `/horoscope` | Today's task horoscope; the same for everyone until midnight UTC |

## XP

Completing a task pays `10 + (4 − priority) × 5`, plus 5 for medium energy, 10 for high, and a random
0–30 for chaotic. Reopening a task claws back exactly what its last completion paid. Each level costs
100 XP more than the one before it.
