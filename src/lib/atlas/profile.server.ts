import type { Sql } from "@/lib/db";
import { iso, isoOrNull } from "./time";
import {
  DEFAULT_PRIVACY,
  type PrivacySettings,
  type Profile,
} from "./types";
import { isValidUsername, usernameCandidates } from "./usernames";

export type ProfileRow = {
  user_id: string;
  display_name: string;
  username: string;
  username_lc: string;
  email: string | null;
  photo_url: string | null;
  bio: string;
  created_at: unknown;
  last_seen: unknown;
  is_online: boolean;
  email_verified: boolean;
  privacy_settings: PrivacySettings | string;
};


type AuthUserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
};

function parsePrivacy(value: unknown): PrivacySettings {
  const raw =
    typeof value === "string"
      ? (JSON.parse(value) as Partial<PrivacySettings>)
      : ((value ?? {}) as Partial<PrivacySettings>);
  return {
    showLastSeen: raw.showLastSeen !== false,
    showOnline: raw.showOnline !== false,
    whoCanMessage: raw.whoCanMessage === "nobody" ? "nobody" : "everyone",
  };
}

export function mapProfile(row: ProfileRow, viewerId: string): Profile {
  const privacy = parsePrivacy(row.privacy_settings);
  const self = row.user_id === viewerId;
  const lastSeen = isoOrNull(row.last_seen);
  return {
    userId: row.user_id,
    displayName: row.display_name,
    username: row.username,
    email: self ? row.email : null,
    photoUrl: row.photo_url,
    bio: row.bio ?? "",
    createdAt: iso(row.created_at),
    lastSeen: self || privacy.showLastSeen ? lastSeen : null,
    isOnline: self || privacy.showOnline ? Boolean(row.is_online) : false,
    emailVerified: self ? Boolean(row.email_verified) : false,
    privacy: self ? privacy : DEFAULT_PRIVACY,
  };
}

export async function readAuthUser(
  sql: Sql,
  userId: string,
): Promise<AuthUserRow | null> {
  const rows = await sql<AuthUserRow>`
    select id, name, email, image, "emailVerified"
    from "user"
    where id = ${userId}
    limit 1
  `;
  return rows[0] ?? null;
}

async function takeUsername(sql: Sql, seed: string, extra: string): Promise<string> {
  for (const candidate of usernameCandidates(seed, extra)) {
    const taken = await sql<{ user_id: string }>`
      select user_id from profiles where username_lc = ${candidate} limit 1
    `;
    if (!taken[0]) return candidate;
  }
  const fallback = `atlas${Date.now().toString(36)}`.slice(0, 24);
  if (!isValidUsername(fallback)) return `atlas${Math.floor(Math.random() * 9999)}`;
  return fallback;
}

export async function ensureProfile(sql: Sql, userId: string): Promise<Profile> {
  const existing = await sql<ProfileRow>`
    select * from profiles where user_id = ${userId} limit 1
  `;
  if (existing[0]) return mapProfile(existing[0], userId);

  const authUser = await readAuthUser(sql, userId);
  const displayName =
    authUser?.name?.trim() ||
    authUser?.email?.split("@")[0] ||
    "Membre ATLAS";
  const username = await takeUsername(
    sql,
    displayName,
    authUser?.id ?? userId,
  );

  await sql`
    insert into profiles (
      user_id, display_name, username, username_lc, email, photo_url,
      email_verified
    ) values (
      ${userId},
      ${displayName.slice(0, 48)},
      ${username},
      ${username},
      ${authUser?.email ?? null},
      ${authUser?.image ?? null},
      ${authUser?.emailVerified ?? false}
    )
  `;

  const created = await sql<ProfileRow>`
    select * from profiles where user_id = ${userId} limit 1
  `;
  if (!created[0]) throw new Error("Impossible de créer le profil.");
  return mapProfile(created[0], userId);
}

export async function getProfileRow(
  sql: Sql,
  userId: string,
): Promise<ProfileRow | undefined> {
  const rows = await sql<ProfileRow>`
    select * from profiles where user_id = ${userId} limit 1
  `;
  return rows[0];
}
