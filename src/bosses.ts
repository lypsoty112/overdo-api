// Boss battles: bossFor turns every P1 task into a boss, named by hashing the task id so the name is
// stable without being stored. A boss has one hit point per subtask plus one for the task itself; each
// ticked subtask lands a hit, and completing the task is the final blow whatever HP is left, worth
// BOSS_BONUS XP.
import { pick } from "./seeded";

export const BOSS_BONUS = 50;

const NAMES = [
  "GRONK",
  "MORDREK",
  "SKARVOK",
  "OOZEBETH",
  "VELKOR",
  "THE UNSCHEDULED",
  "KRAMPUS OF Q3",
  "BARBARA FROM ACCOUNTS",
];

const EPITHETS = [
  "DEVOURER OF INBOXES",
  "EATER OF WEEKENDS",
  "WARDEN OF THE BACKLOG",
  "LORD OF UNREAD MESSAGES",
  "BANE OF FRIDAY AFTERNOONS",
  "KEEPER OF THE STANDUP",
  "WHO WAS DUE YESTERDAY",
  "HOARDER OF TABS",
];

export interface Boss {
  name: string;
  hp: number;
  maxHp: number;
  bounty: number;
}

interface BossCandidate {
  id: string;
  priority: number;
  status: string;
  subtasks: { done: boolean }[];
}

export function bossFor(task: BossCandidate): Boss | null {
  if (task.priority !== 1) return null;
  const maxHp = task.subtasks.length + 1;
  const hits = task.subtasks.filter((subtask) => subtask.done).length;
  const hp = task.status === "done" ? 0 : maxHp - hits;
  return { name: `${pick(NAMES, task.id, 1)}, ${pick(EPITHETS, task.id, 2)}`, hp, maxHp, bounty: BOSS_BONUS };
}
