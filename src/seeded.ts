// Deterministic "randomness" for things that must not change between requests. seed hashes a key with a
// salt, and pick uses that hash to choose from a list, so the same key always gets the same item. The
// string hash alone only nudges the low bits when the salt changes, so pick(…, 1) and pick(…, 2) moved in
// lockstep; MurmurHash3's 32-bit finalizer spreads every input bit across the result to make each salt
// an independent choice.
export function seed(key: string, salt: number): number {
  let hash = [...`${key}:${salt}`].reduce((h, char) => (h * 31 + char.charCodeAt(0)) >>> 0, 7);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return (hash ^ (hash >>> 16)) >>> 0;
}

export function pick<T>(items: readonly T[], key: string, salt: number): T {
  return items[seed(key, salt) % items.length] as T;
}
