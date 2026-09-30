-- ATLAS core schema: profiles, private conversations, messages, reactions,
-- notifications. Social tables (posts, follows, comments, reports) exist so
-- the product can grow without a rewrite. Per-user rows use TEXT user_id.

create table if not exists profiles (
  user_id text primary key,
  display_name text not null,
  username text not null,
  username_lc text not null unique,
  email text,
  photo_url text,
  bio text not null default '',
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  is_online boolean not null default false,
  email_verified boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  privacy_settings jsonb not null default '{"showLastSeen":true,"showOnline":true,"whoCanMessage":"everyone"}'::jsonb
);

create unique index if not exists profiles_username_lc_idx on profiles (username_lc);

create table if not exists conversations (
  id text primary key,
  type text not null default 'direct',
  pair_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_text text,
  last_message_at timestamptz,
  last_message_id text,
  last_message_sender_id text
);

create table if not exists conversation_members (
  conversation_id text not null references conversations (id) on delete cascade,
  user_id text not null,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  last_read_message_id text,
  unread_count integer not null default 0,
  is_muted boolean not null default false,
  hidden boolean not null default false,
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_idx
  on conversation_members (user_id, hidden);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations (id) on delete cascade,
  sender_id text not null,
  type text not null default 'text',
  body text not null default '',
  media_url text,
  reply_to_id text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists messages_convo_created_idx
  on messages (conversation_id, created_at desc);

create table if not exists message_reactions (
  message_id text not null references messages (id) on delete cascade,
  user_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  type text not null,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on notifications (user_id, created_at desc);

-- Future social graph / feed / moderation (unused by MVP UI).
create table if not exists follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists posts (
  id text primary key,
  author_id text not null,
  body text not null default '',
  media_url text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists comments (
  id text primary key,
  post_id text not null,
  author_id text not null,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists reports (
  id text primary key,
  reporter_id text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  details text,
  created_at timestamptz not null default now(),
  status text not null default 'open'
);
