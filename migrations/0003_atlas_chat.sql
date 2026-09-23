-- Typing indicator + peer read receipts live on membership rows.
alter table conversation_members
  add column if not exists typing_at timestamptz;
