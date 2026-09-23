export function directPairKey(a: string, b: string): string {
  if (a === b) throw new Error("Vous ne pouvez pas vous écrire à vous-même.");
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}
