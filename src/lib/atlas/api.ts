import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isAllowedDataImage } from "./media";
import { directPairKey } from "./pair";
import {
  ensureProfile,
  getProfileRow,
  mapProfile,
  type ProfileRow,
} from "./profile.server";
import { iso, isoOrNull } from "./time";
import type {
  ChatMessage,
  ConversationSummary,
  MessageReaction,
  NotificationItem,
  Profile,
} from "./types";
import { isValidUsername, normalizeUsername } from "./usernames";

async function noStore() {
  try {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("cache-control", "no-store");
    setResponseHeader("vary", "Cookie, Authorization");
  } catch {
    /* headers unavailable outside a request */
  }
}

const idSchema = z.string().min(1).max(80);
const bodySchema = z.string().trim().max(4000);

type MemberRow = {
  conversation_id: string;
  user_id: string;
  unread_count: number | string;
};

type ConvoRow = {
  id: string;
  type: string;
  last_message_text: string | null;
  last_message_at: unknown;
  last_message_sender_id: string | null;
  unread_count: number | string;
  is_muted: boolean;
  peer_id: string;
  peer_name: string;
  peer_username: string;
  peer_photo: string | null;
  peer_bio: string | null;
  peer_last_seen: unknown;
  peer_online: boolean;
  peer_privacy: unknown;
  peer_last_read_at: unknown;
  peer_typing_at: unknown;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  body: string;
  media_url: string | null;
  reply_to_id: string | null;
  created_at: unknown;
  edited_at: unknown;
  deleted_at: unknown;
  reply_body: string | null;
  reply_sender_id: string | null;
  reply_deleted: unknown;
};

function asInt(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parsePrivacyFlag(raw: unknown, key: "showLastSeen" | "showOnline"): boolean {
  try {
    if (raw == null) return true;
    const obj =
      typeof raw === "string" ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>);
    return obj[key] !== false;
  } catch {
    return true;
  }
}

function isTypingStamp(value: unknown): boolean {
  if (value == null) return false;
  const t = new Date(iso(value)).getTime();
  return Number.isFinite(t) && Date.now() - t < 8_000;
}

function mapConversation(row: ConvoRow): ConversationSummary {
  const showOnline = parsePrivacyFlag(row.peer_privacy, "showOnline");
  const showLastSeen = parsePrivacyFlag(row.peer_privacy, "showLastSeen");
  return {
    id: row.id,
    type: "direct",
    lastMessageText: row.last_message_text,
    lastMessageAt: isoOrNull(row.last_message_at),
    lastMessageSenderId: row.last_message_sender_id,
    unreadCount: asInt(row.unread_count),
    isMuted: Boolean(row.is_muted),
    peerTyping: isTypingStamp(row.peer_typing_at),
    peerLastReadAt: isoOrNull(row.peer_last_read_at),
    peer: {
      userId: row.peer_id,
      displayName: row.peer_name,
      username: row.peer_username,
      photoUrl: row.peer_photo,
      bio: row.peer_bio ?? "",
      isOnline: showOnline ? Boolean(row.peer_online) : false,
      lastSeen: showLastSeen ? isoOrNull(row.peer_last_seen) : null,
    },
  };
}

function mapMessage(row: MessageRow, reactions: MessageReaction[]): ChatMessage {
  const deleted = Boolean(row.deleted_at);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type: row.type === "image" ? "image" : row.type === "file" ? "file" : "text",
    body: deleted ? "" : row.body,
    mediaUrl: deleted ? null : row.media_url,
    replyToId: row.reply_to_id,
    replyPreview:
      row.reply_to_id && row.reply_sender_id
        ? {
            body: row.reply_deleted ? "" : (row.reply_body ?? ""),
            senderId: row.reply_sender_id,
          }
        : null,
    createdAt: iso(row.created_at),
    editedAt: isoOrNull(row.edited_at),
    deletedAt: isoOrNull(row.deleted_at),
    reactions,
  };
}

async function requireMember(
  conversationId: string,
  userId: string,
): Promise<void> {
  const sql = await getSql();
  const rows = await sql<MemberRow>`
    select conversation_id, user_id, unread_count
    from conversation_members
    where conversation_id = ${conversationId} and user_id = ${userId}
    limit 1
  `;
  if (!rows[0]) throw new Error("Conversation introuvable.");
}

async function loadReactions(
  ids: string[],
): Promise<Map<string, MessageReaction[]>> {
  const map = new Map<string, MessageReaction[]>();
  if (ids.length === 0) return map;
  const sql = await getSql();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await sql.query<{ message_id: string; user_id: string; emoji: string }>(
    `select message_id, user_id, emoji from message_reactions where message_id in (${placeholders})`,
    ids,
  );
  for (const row of rows) {
    const list = map.get(row.message_id) ?? [];
    list.push({ emoji: row.emoji, userId: row.user_id });
    map.set(row.message_id, list);
  }
  return map;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Profile> => {
    await noStore();
    const sql = await getSql();
    return ensureProfile(sql, context.userId);
  });

export const heartbeat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await noStore();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    await sql`
      update profiles
      set last_seen = now(), is_online = true
      where user_id = ${context.userId}
    `;
    await sql`
      update profiles
      set is_online = false
      where is_online = true
        and last_seen < now() - interval '2 minutes'
    `;
    return { ok: true as const };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      displayName: z.string().trim().min(1).max(48).optional(),
      username: z.string().trim().min(3).max(24).optional(),
      bio: z.string().max(280).optional(),
      photoUrl: z.string().max(400_000).nullable().optional(),
      privacy: z
        .object({
          showLastSeen: z.boolean(),
          showOnline: z.boolean(),
          whoCanMessage: z.enum(["everyone", "nobody"]),
        })
        .optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<Profile> => {
    await noStore();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);

    if (data.displayName) {
      await sql`
        update profiles
        set display_name = ${data.displayName}
        where user_id = ${context.userId}
      `;
    }
    if (data.username) {
      const username = normalizeUsername(data.username);
      if (!isValidUsername(username)) {
        throw new Error("Identifiant invalide. 3–24 caractères, commence par une lettre.");
      }
      const clash = await sql<{ user_id: string }>`
        select user_id from profiles
        where username_lc = ${username} and user_id <> ${context.userId}
        limit 1
      `;
      if (clash[0]) throw new Error("Cet identifiant est déjà pris.");
      await sql`
        update profiles
        set username = ${username}, username_lc = ${username}
        where user_id = ${context.userId}
      `;
    }
    if (data.bio !== undefined) {
      await sql`
        update profiles set bio = ${data.bio} where user_id = ${context.userId}
      `;
    }
    if (data.photoUrl !== undefined) {
      if (data.photoUrl && !isAllowedDataImage(data.photoUrl) && !data.photoUrl.startsWith("https://")) {
        throw new Error("Photo de profil invalide.");
      }
      await sql`
        update profiles set photo_url = ${data.photoUrl} where user_id = ${context.userId}
      `;
    }
    if (data.privacy) {
      await sql`
        update profiles
        set privacy_settings = ${JSON.stringify(data.privacy)}::jsonb
        where user_id = ${context.userId}
      `;
    }

    const row = await getProfileRow(sql, context.userId);
    if (!row) throw new Error("Profil introuvable.");
    return mapProfile(row, context.userId);
  });

export const searchPeople = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ q: z.string().trim().min(2).max(40) }))
  .handler(async ({ context, data }): Promise<Profile[]> => {
    await noStore();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const needle = `%${normalizeUsername(data.q) || data.q.trim().toLowerCase()}%`;
    const rows = await sql<ProfileRow>`
      select * from profiles
      where user_id <> ${context.userId}
        and (
          username_lc like ${needle}
          or lower(display_name) like ${`%${data.q.trim().toLowerCase()}%`}
        )
      order by username_lc
      limit 20
    `;
    return rows.map((row) => mapProfile(row, context.userId));
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ConversationSummary[]> => {
    await noStore();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const rows = await sql<ConvoRow>`
      select
        c.id,
        c.type,
        c.last_message_text,
        c.last_message_at,
        c.last_message_sender_id,
        m.unread_count,
        m.is_muted,
        p.user_id as peer_id,
        p.display_name as peer_name,
        p.username as peer_username,
        p.photo_url as peer_photo,
        p.bio as peer_bio,
        p.last_seen as peer_last_seen,
        p.is_online as peer_online,
        p.privacy_settings as peer_privacy,
        m2.last_read_at as peer_last_read_at,
        m2.typing_at as peer_typing_at
      from conversation_members m
      join conversations c on c.id = m.conversation_id
      join conversation_members m2
        on m2.conversation_id = c.id and m2.user_id <> m.user_id
      join profiles p on p.user_id = m2.user_id
      where m.user_id = ${context.userId} and m.hidden = false
      order by coalesce(c.last_message_at, c.created_at) desc
      limit 80
    `;
    return rows.map(mapConversation);
  });

export const startDirectConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ userId: idSchema }))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await noStore();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    if (data.userId === context.userId) {
      throw new Error("Vous ne pouvez pas vous écrire à vous-même.");
    }
    const peer = await getProfileRow(sql, data.userId);
    if (!peer) throw new Error("Personne introuvable.");
    const privacy =
      typeof peer.privacy_settings === "string"
        ? (JSON.parse(peer.privacy_settings) as { whoCanMessage?: string })
        : peer.privacy_settings;
    if (privacy?.whoCanMessage === "nobody") {
      throw new Error("Cette personne n’accepte pas de nouveaux messages.");
    }

    const pairKey = directPairKey(context.userId, data.userId);
    const existing = await sql<{ id: string }>`
      select id from conversations where pair_key = ${pairKey} limit 1
    `;
    if (existing[0]) {
      await sql`
        update conversation_members
        set hidden = false
        where conversation_id = ${existing[0].id} and user_id = ${context.userId}
      `;
      return { id: existing[0].id };
    }

    const id = crypto.randomUUID();
    await sql`
      insert into conversations (id, type, pair_key)
      values (${id}, 'direct', ${pairKey})
    `;
    await sql`
      insert into conversation_members (conversation_id, user_id)
      values (${id}, ${context.userId}), (${id}, ${data.userId})
    `;
    return { id };
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ conversationId: idSchema }))
  .handler(async ({ context, data }): Promise<ConversationSummary> => {
    await noStore();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    await requireMember(data.conversationId, context.userId);
    const rows = await sql<ConvoRow>`
      select
        c.id,
        c.type,
        c.last_message_text,
        c.last_message_at,
        c.last_message_sender_id,
        m.unread_count,
        m.is_muted,
        p.user_id as peer_id,
        p.display_name as peer_name,
        p.username as peer_username,
        p.photo_url as peer_photo,
        p.bio as peer_bio,
        p.last_seen as peer_last_seen,
        p.is_online as peer_online,
        p.privacy_settings as peer_privacy,
        m2.last_read_at as peer_last_read_at,
        m2.typing_at as peer_typing_at
      from conversation_members m
      join conversations c on c.id = m.conversation_id
      join conversation_members m2
        on m2.conversation_id = c.id and m2.user_id <> m.user_id
      join profiles p on p.user_id = m2.user_id
      where m.user_id = ${context.userId} and c.id = ${data.conversationId}
      limit 1
    `;
    if (!rows[0]) throw new Error("Conversation introuvable.");
    return mapConversation(rows[0]);
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      conversationId: idSchema,
      before: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
  )
  .handler(
    async ({
      context,
      data,
    }): Promise<{ messages: ChatMessage[]; hasMore: boolean }> => {
      await noStore();
      const sql = await getSql();
      await requireMember(data.conversationId, context.userId);
      const limit = data.limit ?? 40;
      const rows = data.before
        ? await sql<MessageRow>`
            select
              m.*,
              r.body as reply_body,
              r.sender_id as reply_sender_id,
              r.deleted_at as reply_deleted
            from messages m
            left join messages r on r.id = m.reply_to_id
            where m.conversation_id = ${data.conversationId}
              and m.created_at < ${data.before}::timestamptz
            order by m.created_at desc
            limit ${limit + 1}
          `
        : await sql<MessageRow>`
            select
              m.*,
              r.body as reply_body,
              r.sender_id as reply_sender_id,
              r.deleted_at as reply_deleted
            from messages m
            left join messages r on r.id = m.reply_to_id
            where m.conversation_id = ${data.conversationId}
            order by m.created_at desc
            limit ${limit + 1}
          `;
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit);
      const reactions = await loadReactions(page.map((row) => row.id));
      const messages = page
        .slice()
        .reverse()
        .map((row) => mapMessage(row, reactions.get(row.id) ?? []));
      return { messages, hasMore };
    },
  );

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      conversationId: idSchema,
      body: bodySchema.optional(),
      type: z.enum(["text", "image"]).default("text"),
      mediaUrl: z.string().max(400_000).optional(),
      replyToId: z.string().max(80).optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<ChatMessage> => {
    await noStore();
    const sql = await getSql();
    await requireMember(data.conversationId, context.userId);
    const me = await ensureProfile(sql, context.userId);

    const type = data.type ?? "text";
    const body = (data.body ?? "").trim();
    if (type === "text" && !body) throw new Error("Message vide.");
    if (type === "image") {
      if (!data.mediaUrl || !isAllowedDataImage(data.mediaUrl)) {
        throw new Error("Image invalide.");
      }
    }

    if (data.replyToId) {
      const reply = await sql<{ id: string }>`
        select id from messages
        where id = ${data.replyToId} and conversation_id = ${data.conversationId}
        limit 1
      `;
      if (!reply[0]) throw new Error("Message d’origine introuvable.");
    }

    const id = crypto.randomUUID();
    const preview =
      type === "image" ? "Photo" : body.length > 140 ? `${body.slice(0, 137)}…` : body;

    await sql`
      insert into messages (
        id, conversation_id, sender_id, type, body, media_url, reply_to_id
      ) values (
        ${id},
        ${data.conversationId},
        ${context.userId},
        ${type},
        ${body},
        ${type === "image" ? data.mediaUrl ?? null : null},
        ${data.replyToId ?? null}
      )
    `;
    await sql`
      update conversations
      set
        last_message_text = ${preview},
        last_message_at = now(),
        last_message_id = ${id},
        last_message_sender_id = ${context.userId},
        updated_at = now()
      where id = ${data.conversationId}
    `;
    await sql`
      update conversation_members
      set unread_count = unread_count + 1, hidden = false
      where conversation_id = ${data.conversationId} and user_id <> ${context.userId}
    `;
    await sql`
      update conversation_members
      set last_read_at = now(), last_read_message_id = ${id}, unread_count = 0, hidden = false, typing_at = null
      where conversation_id = ${data.conversationId} and user_id = ${context.userId}
    `;

    const peers = await sql<{ user_id: string; is_muted: boolean }>`
      select user_id, is_muted from conversation_members
      where conversation_id = ${data.conversationId} and user_id <> ${context.userId}
    `;
    for (const peer of peers) {
      if (peer.is_muted) continue;
      await sql`
        insert into notifications (id, user_id, type, title, body, data)
        values (
          ${crypto.randomUUID()},
          ${peer.user_id},
          'message',
          ${me.displayName},
          ${preview},
          ${JSON.stringify({ conversationId: data.conversationId, messageId: id })}::jsonb
        )
      `;
    }

    const rows = await sql<MessageRow>`
      select
        m.*,
        r.body as reply_body,
        r.sender_id as reply_sender_id,
        r.deleted_at as reply_deleted
      from messages m
      left join messages r on r.id = m.reply_to_id
      where m.id = ${id}
      limit 1
    `;
    if (!rows[0]) throw new Error("Impossible d’envoyer le message.");
    return mapMessage(rows[0], []);
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ conversationId: idSchema }))
  .handler(async ({ context, data }) => {
    await noStore();
    await requireMember(data.conversationId, context.userId);
    const sql = await getSql();
    await sql`
      update conversation_members
      set
        unread_count = 0,
        last_read_at = now(),
        last_read_message_id = (
          select id from messages
          where conversation_id = ${data.conversationId}
          order by created_at desc
          limit 1
        )
      where conversation_id = ${data.conversationId} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ messageId: idSchema }))
  .handler(async ({ context, data }) => {
    await noStore();
    const sql = await getSql();
    const rows = await sql<{ id: string; conversation_id: string; sender_id: string }>`
      select id, conversation_id, sender_id from messages where id = ${data.messageId} limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Message introuvable.");
    if (row.sender_id !== context.userId) {
      throw new Error("Vous ne pouvez supprimer que vos messages.");
    }
    await requireMember(row.conversation_id, context.userId);
    await sql`
      update messages
      set deleted_at = now(), body = '', media_url = null
      where id = ${data.messageId}
    `;
    const latest = await sql<{
      id: string;
      type: string;
      body: string;
      sender_id: string;
      deleted_at: unknown;
    }>`
      select id, type, body, sender_id, deleted_at
      from messages
      where conversation_id = ${row.conversation_id} and deleted_at is null
      order by created_at desc
      limit 1
    `;
    const last = latest[0];
    const preview = last
      ? last.type === "image"
        ? "Photo"
        : last.body.length > 140
          ? `${last.body.slice(0, 137)}…`
          : last.body
      : "Conversation";
    await sql`
      update conversations
      set
        last_message_text = ${preview},
        last_message_id = ${last?.id ?? null},
        last_message_sender_id = ${last?.sender_id ?? null}
      where id = ${row.conversation_id} and last_message_id = ${data.messageId}
    `;
    return { ok: true as const };
  });

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      messageId: idSchema,
      emoji: z.string().min(1).max(8),
    }),
  )
  .handler(async ({ context, data }) => {
    await noStore();
    const sql = await getSql();
    const rows = await sql<{ id: string; conversation_id: string }>`
      select id, conversation_id from messages where id = ${data.messageId} limit 1
    `;
    if (!rows[0]) throw new Error("Message introuvable.");
    await requireMember(rows[0].conversation_id, context.userId);
    const existing = await sql<{ emoji: string }>`
      select emoji from message_reactions
      where message_id = ${data.messageId} and user_id = ${context.userId}
      limit 1
    `;
    if (existing[0]?.emoji === data.emoji) {
      await sql`
        delete from message_reactions
        where message_id = ${data.messageId} and user_id = ${context.userId}
      `;
    } else if (existing[0]) {
      await sql`
        update message_reactions
        set emoji = ${data.emoji}
        where message_id = ${data.messageId} and user_id = ${context.userId}
      `;
    } else {
      await sql`
        insert into message_reactions (message_id, user_id, emoji)
        values (${data.messageId}, ${context.userId}, ${data.emoji})
      `;
    }
    const all = await sql<MessageReaction>`
      select emoji, user_id as "userId" from message_reactions
      where message_id = ${data.messageId}
    `;
    return { reactions: all };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<NotificationItem[]> => {
    await noStore();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const rows = await sql<{
      id: string;
      type: string;
      title: string;
      body: string;
      data: { conversationId?: string } | string;
      read_at: unknown;
      created_at: unknown;
    }>`
      select id, type, title, body, data, read_at, created_at
      from notifications
      where user_id = ${context.userId}
      order by created_at desc
      limit 30
    `;
    return rows.map((row) => {
      const payload =
        typeof row.data === "string"
          ? (JSON.parse(row.data) as { conversationId?: string })
          : row.data;
      return {
        id: row.id,
        type: row.type,
        title: row.title,
        body: row.body,
        conversationId: payload?.conversationId ?? null,
        read: Boolean(row.read_at),
        createdAt: iso(row.created_at),
      };
    });
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await noStore();
    const sql = await getSql();
    await sql`
      update notifications
      set read_at = now()
      where user_id = ${context.userId} and read_at is null
    `;
    return { ok: true as const };
  });

export const editMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      messageId: idSchema,
      body: bodySchema.min(1),
    }),
  )
  .handler(async ({ context, data }): Promise<ChatMessage> => {
    await noStore();
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      conversation_id: string;
      sender_id: string;
      type: string;
      deleted_at: unknown;
    }>`
      select id, conversation_id, sender_id, type, deleted_at
      from messages
      where id = ${data.messageId}
      limit 1
    `;
    const row = rows[0];
    if (!row) throw new Error("Message introuvable.");
    if (row.sender_id !== context.userId) {
      throw new Error("Vous ne pouvez modifier que vos messages.");
    }
    if (row.deleted_at) throw new Error("Message déjà supprimé.");
    if (row.type !== "text") throw new Error("Seuls les messages texte peuvent être modifiés.");
    await requireMember(row.conversation_id, context.userId);
    const body = data.body.trim();
    await sql`
      update messages
      set body = ${body}, edited_at = now()
      where id = ${data.messageId}
    `;
    const preview = body.length > 140 ? `${body.slice(0, 137)}…` : body;
    await sql`
      update conversations
      set last_message_text = ${preview}, updated_at = now()
      where id = ${row.conversation_id} and last_message_id = ${data.messageId}
    `;
    const mapped = await sql<MessageRow>`
      select
        m.*,
        r.body as reply_body,
        r.sender_id as reply_sender_id,
        r.deleted_at as reply_deleted
      from messages m
      left join messages r on r.id = m.reply_to_id
      where m.id = ${data.messageId}
      limit 1
    `;
    if (!mapped[0]) throw new Error("Impossible de modifier le message.");
    const reactions = await loadReactions([data.messageId]);
    return mapMessage(mapped[0], reactions.get(data.messageId) ?? []);
  });

export const hideConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ conversationId: idSchema }))
  .handler(async ({ context, data }) => {
    await noStore();
    await requireMember(data.conversationId, context.userId);
    const sql = await getSql();
    await sql`
      update conversation_members
      set hidden = true
      where conversation_id = ${data.conversationId} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const muteConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ conversationId: idSchema, muted: z.boolean() }))
  .handler(async ({ context, data }) => {
    await noStore();
    await requireMember(data.conversationId, context.userId);
    const sql = await getSql();
    await sql`
      update conversation_members
      set is_muted = ${data.muted}
      where conversation_id = ${data.conversationId} and user_id = ${context.userId}
    `;
    return { isMuted: data.muted };
  });

export const setTyping = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ conversationId: idSchema }))
  .handler(async ({ context, data }) => {
    await noStore();
    await requireMember(data.conversationId, context.userId);
    const sql = await getSql();
    await sql`
      update conversation_members
      set typing_at = now()
      where conversation_id = ${data.conversationId} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });
