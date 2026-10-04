// The daily task horoscope: getHoroscope picks a sign, a reading, a lucky priority and a thing to avoid
// from fixed lists. seed hashes the date with a salt per field, so everyone gets the same nonsense all
// day, new nonsense tomorrow, and the fields do not move in lockstep.
const SIGNS = [
  "The Overcommitter",
  "The Snoozer",
  "The List Maker",
  "The Inbox Zero",
  "The Side Quester",
  "The Deadline Surfer",
  "The Color Coder",
  "The Someday Sage",
  "The Tab Hoarder",
  "The Early Bird (Allegedly)",
  "The Meeting Survivor",
  "The Ninth Pomodoro",
];

const READINGS = [
  "A task you have postponed three times is now postponing you.",
  "Mercury is in retrograde, which covers that unanswered email.",
  "Today favours small wins. Tick one subtask and call it momentum.",
  "Someone will ask if you have a minute. You do not.",
  "Your energy is chaotic. Embrace it, or at least tag it.",
  "The stars suggest renaming a task until it sounds easier.",
  "A forgotten due date approaches from the east.",
  "Do the thing you would least like to explain later.",
];

const AVOID = [
  "new browser tabs",
  "starting a second to-do app",
  "reorganising your tags",
  "meetings without an agenda",
  "the phrase 'quick question'",
  "colour-coding anything",
];

function seed(date: string, salt: number): number {
  return [...`${date}:${salt}`].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function pick<T>(items: T[], date: string, salt: number): T | undefined {
  return items[seed(date, salt) % items.length];
}

export function getHoroscope(): Response {
  const date = new Date().toISOString().slice(0, 10);
  return Response.json({
    date,
    sign: pick(SIGNS, date, 1),
    reading: pick(READINGS, date, 2),
    luckyPriority: 1 + (seed(date, 3) % 4),
    avoid: pick(AVOID, date, 4),
  });
}
