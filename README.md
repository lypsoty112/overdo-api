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
| GET | `/tasks` | Every live task, with its subtasks, tags and `boss` (`null` unless P1) |
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
| GET | `/achievements` | Every achievement, with `unlockedAt` (`null` while locked) |

## XP

Completing a task pays `10 + (4 − priority) × 5`, plus 5 for medium energy, 10 for high, and a random
0–30 for chaotic. Reopening a task claws back exactly what its last completion paid. Each level costs
100 XP more than the one before it.

## Boss battles

Every P1 task is a boss: `{ name, hp, maxHp, bounty }`, named from a hash of its id so the name never
changes. It has one HP per subtask plus one; each ticked subtask lands a hit, and completing the task
finishes it off whatever HP is left, paying the `bounty` (50 XP) on top of the normal payout. Reopening
claws the bounty back with the rest.

## Achievements

Eight achievements, listed in `src/achievements.ts`, each with its own SQL condition over tasks, focus
sessions and moods. Completing a task, finishing a full-length focus session and logging a mood all
check every condition and unlock the ones that hold. Unlocks are permanent and pay no XP; reopening or
deleting a task takes nothing back, and activity from before an achievement existed counts. Times use
the database clock, so "before noon" is noon in the database's time zone.

| Achievement | Unlocks when |
| --- | --- |
| 🩸 First blood | A task is completed |
| 🐦 Early bird | A P1 is completed before noon |
| ⚔️ Boss slayer | Three P1s are completed |
| 🎩 Hat trick | Three tasks are completed on the same day |
| 🦉 Night owl | A task is completed between midnight and 5 a.m. |
| 🐌 Fashionably late | A task is completed seven or more days after its due date |
| 🍅 Tomato farmer | Four full-length focus sessions end on the same day |
| 🐺 Unleashed | A `feral` mood is logged |
