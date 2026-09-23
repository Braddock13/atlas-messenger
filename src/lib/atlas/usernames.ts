const USERNAME_RE = /^[a-z][a-z0-9_]{2,23}$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

export function isValidUsername(input: string): boolean {
  return USERNAME_RE.test(input);
}

export function usernameFromIdentity(name: string): string {
  const deaccented = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const compact = deaccented.replace(/[^a-z0-9]/g, "");
  const startsWithLetter = compact.replace(/^[^a-z]+/, "");
  const base = (startsWithLetter || "atlas").slice(0, 16);
  return base.length >= 3 ? base : `${base}user`.slice(0, 16);
}

export function usernameCandidates(base: string, extra: string): string[] {
  const root = usernameFromIdentity(base);
  const suffix = extra.replace(/[^a-z0-9]/g, "").slice(-4);
  const out = [root];
  if (suffix) out.push(`${root}${suffix}`.slice(0, 24));
  for (let i = 2; i <= 12; i += 1) {
    out.push(`${root}${i}`.slice(0, 24));
  }
  return [...new Set(out)].filter(isValidUsername);
}
