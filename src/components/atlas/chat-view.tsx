import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ImagePlus,
  MoreHorizontal,
  Send,
  Smile,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/atlas/empty-state";
import { PresenceDot } from "@/components/atlas/presence";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteMessage,
  editMessage,
  getConversation,
  hideConversation,
  listMessages,
  markConversationRead,
  muteConversation,
  sendMessage,
  setTyping,
  toggleReaction,
} from "@/lib/atlas/api";
import { compressChatImage } from "@/lib/atlas/media";
import {
  formatClock,
  formatDayLabel,
  formatPresence,
  sameCalendarDay,
} from "@/lib/atlas/time";
import { REACTION_SET, type ChatMessage } from "@/lib/atlas/types";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export function ChatView({ conversationId }: { conversationId: string }) {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const typingAt = useRef(0);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const stickToBottom = useRef(true);

  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const convo = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation({ data: { conversationId } }),
    refetchInterval: 2500,
  });

  const thread = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMessages({ data: { conversationId } }),
    refetchInterval: 1800,
  });

  useEffect(() => {
    setOlder([]);
    setHasMore(false);
    setPending([]);
    setReplyTo(null);
    setDraft("");
    stickToBottom.current = true;
  }, [conversationId]);

  useEffect(() => {
    if (older.length === 0 && thread.data) setHasMore(thread.data.hasMore);
  }, [older.length, thread.data]);

  const live = thread.data?.messages ?? [];
  const liveIds = new Set(live.map((m) => m.id));
  const pendingKept = pending.filter((p) => {
    if (liveIds.has(p.id)) return false;
    return !live.some(
      (m) =>
        m.senderId === p.senderId &&
        m.body === p.body &&
        m.type === p.type &&
        Math.abs(new Date(m.createdAt).getTime() - new Date(p.createdAt).getTime()) < 60_000,
    );
  });
  const messages = [...older.filter((m) => !liveIds.has(m.id)), ...live, ...pendingKept];
  const lastId = messages.at(-1)?.id;
  const oldest = messages[0];
  const peerLastReadAt = convo.data?.peerLastReadAt ?? null;

  async function loadOlder() {
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    const el = scroller.current;
    const previousHeight = el?.scrollHeight ?? 0;
    try {
      const page = await listMessages({
        data: { conversationId, before: oldest.createdAt },
      });
      setOlder((prev) => [...page.messages, ...prev]);
      setHasMore(page.hasMore);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - previousHeight;
      });
    } catch {
      toast.error("Impossible de charger l’historique.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void markConversationRead({ data: { conversationId } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
      .catch(() => undefined);
  }, [conversationId, lastId, queryClient]);

  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, lastId]);

  const send = useMutation({
    mutationFn: (input: { body?: string; type?: "text" | "image"; mediaUrl?: string }) =>
      sendMessage({
        data: {
          conversationId,
          body: input.body,
          type: input.type ?? "text",
          mediaUrl: input.mediaUrl,
          replyToId: replyTo?.id,
        },
      }),
    onSuccess: (message) => {
      setDraft("");
      setReplyTo(null);
      setPending((prev) => prev.filter((p) => p.body !== message.body || p.type !== message.type));
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      if (composerRef.current) {
        composerRef.current.style.height = "";
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Impossible d’envoyer le message");
    },
  });

  function pulseTyping() {
    const now = Date.now();
    if (now - typingAt.current < 2000) return;
    typingAt.current = now;
    void setTyping({ data: { conversationId } }).catch(() => undefined);
  }

  async function onSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const optimistic: ChatMessage = {
      id: `pending:${crypto.randomUUID()}`,
      conversationId,
      senderId: me?.id ?? "me",
      type: "text",
      body,
      mediaUrl: null,
      replyToId: replyTo?.id ?? null,
      replyPreview: replyTo
        ? { body: replyTo.body || "Photo", senderId: replyTo.senderId }
        : null,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      reactions: [],
      pending: true,
    };
    setPending((prev) => [...prev, optimistic]);
    stickToBottom.current = true;
    try {
      await send.mutateAsync({ body, type: "text" });
    } catch {
      setPending((prev) => prev.filter((p) => p.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  async function onImage(file: File | undefined) {
    if (!file) return;
    setSending(true);
    try {
      const mediaUrl = await compressChatImage(file);
      await send.mutateAsync({ type: "image", mediaUrl, body: draft.trim() || undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d’envoyer l’image");
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const peer = convo.data?.peer;
  const presence = peer ? formatPresence(peer.isOnline, peer.lastSeen) : "";
  const subtitle = convo.data?.peerTyping ? "écrit…" : presence;

  async function onHide() {
    try {
      await hideConversation({ data: { conversationId } });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      await navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de masquer");
    }
  }

  async function onMute(muted: boolean) {
    try {
      await muteConversation({ data: { conversationId, muted } });
      void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 md:px-4">
        <Link
          to="/app"
          className="grid size-11 place-items-center rounded-full text-foreground hover:bg-secondary md:hidden"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </Link>
        {convo.isPending ? (
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : convo.isError || !peer ? (
          <p className="text-sm text-destructive">Conversation introuvable.</p>
        ) : (
          <>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-sm)] px-1 text-left hover:bg-secondary/70"
              onClick={() => setProfileOpen(true)}
            >
              <span className="relative">
                <Avatar src={peer.photoUrl} name={peer.displayName} />
                <PresenceDot isOnline={peer.isOnline} lastSeen={peer.lastSeen} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium leading-tight">{peer.displayName}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{peer.username}
                  {subtitle ? ` · ${subtitle}` : ""}
                </span>
              </span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Actions de la conversation">
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                  Voir le profil
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void onMute(!convo.data?.isMuted)}>
                  {convo.data?.isMuted ? (
                    <>
                      <Volume2 className="size-4" />
                      Réactiver les notifications
                    </>
                  ) : (
                    <>
                      <VolumeX className="size-4" />
                      Couper les notifications
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void onHide()}>
                  Masquer la conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </header>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {thread.isPending ? (
          <div className="space-y-3">
            <Skeleton className="ml-auto h-12 w-2/3" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="ml-auto h-12 w-1/3" />
          </div>
        ) : thread.isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            Impossible de charger les messages.
          </p>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<Send className="size-5" />}
            title="Début de la conversation"
            description="Écrivez le premier message. Il restera entre vous deux."
          />
        ) : (
          <ul className="space-y-2">
            {hasMore ? (
              <li className="flex justify-center py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => void loadOlder()}
                >
                  {loadingMore ? "Chargement…" : "Messages précédents"}
                </Button>
              </li>
            ) : null}
            {messages.map((message, index) => {
              const prev = messages[index - 1];
              const showDay = !prev || !sameCalendarDay(prev.createdAt, message.createdAt);
              const read =
                Boolean(me?.id) &&
                message.senderId === me?.id &&
                !message.pending &&
                peerLastReadAt != null &&
                new Date(peerLastReadAt).getTime() >= new Date(message.createdAt).getTime() - 400;
              return (
                <li key={message.id} className="space-y-2">
                  {showDay ? (
                    <p className="py-3 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {formatDayLabel(message.createdAt)}
                    </p>
                  ) : null}
                  <MessageBubble
                    message={message}
                    mine={message.senderId === me?.id}
                    meId={me?.id ?? ""}
                    read={read}
                    onReply={() => setReplyTo(message)}
                    onImage={setLightbox}
                    onChanged={() => {
                      void queryClient.invalidateQueries({
                        queryKey: ["messages", conversationId],
                      });
                      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
                    }}
                  />
                </li>
              );
            })}
            {convo.data?.peerTyping ? (
              <li className="flex justify-start pt-1">
                <span className="rounded-[18px] rounded-bl-md bg-secondary px-3.5 py-2 text-sm text-muted-foreground">
                  écrit
                  <span className="atlas-typing-dots">…</span>
                </span>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      {replyTo ? (
        <div className="flex items-center justify-between border-t border-border bg-secondary/60 px-4 py-2 text-sm">
          <div className="min-w-0">
            <p className="text-xs font-medium text-signal">Réponse</p>
            <p className="truncate text-muted-foreground">
              {replyTo.deletedAt ? "Message supprimé" : replyTo.body || "Photo"}
            </p>
          </div>
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full hover:bg-secondary"
            onClick={() => setReplyTo(null)}
            aria-label="Annuler la réponse"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <form
        className="flex shrink-0 items-end gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          void onSend();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void onImage(e.target.files?.[0])}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Joindre une image"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
        >
          <ImagePlus className="size-5" />
        </Button>
        <textarea
          ref={composerRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            if (e.target.value.trim()) pulseTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
          rows={1}
          placeholder="Écrire un message"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[var(--radius-md)] border border-input bg-card px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || !draft.trim()}
          aria-label="Envoyer"
        >
          <Send className="size-4" />
        </Button>
      </form>

      <Dialog open={Boolean(lightbox)} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="w-[min(92vw,720px)] overflow-hidden p-2">
          <DialogTitle className="sr-only">Image</DialogTitle>
          {lightbox ? (
            <img src={lightbox} alt="" className="max-h-[80vh] w-full rounded-[var(--radius-md)] object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="w-[min(92vw,400px)] p-6">
          <DialogTitle className="sr-only">Profil</DialogTitle>
          {peer ? (
            <div className="flex flex-col items-center text-center">
              <span className="relative">
                <Avatar src={peer.photoUrl} name={peer.displayName} size="xl" />
                <PresenceDot isOnline={peer.isOnline} lastSeen={peer.lastSeen} />
              </span>
              <p className="mt-4 font-display text-xl font-semibold tracking-[-0.03em]">
                {peer.displayName}
              </p>
              <p className="text-sm text-muted-foreground">@{peer.username}</p>
              <p className="mt-1 text-xs text-muted-foreground">{presence}</p>
              {peer.bio ? (
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {peer.bio}
                </p>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Aucune bio.</p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  meId,
  read,
  onReply,
  onImage,
  onChanged,
}: {
  message: ChatMessage;
  mine: boolean;
  meId: string;
  read: boolean;
  onReply: () => void;
  onImage: (url: string) => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.body);

  const grouped = useMemo(() => {
    return message.reactions.reduce(
      (acc, reaction) => {
        const item = acc.get(reaction.emoji) ?? { count: 0, mine: false };
        item.count += 1;
        if (reaction.userId === meId) item.mine = true;
        return acc.set(reaction.emoji, item);
      },
      new Map<string, { count: number; mine: boolean }>(),
    );
  }, [message.reactions, meId]);

  async function onDelete() {
    try {
      await deleteMessage({ data: { messageId: message.id } });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  async function onReact(emoji: string) {
    try {
      await toggleReaction({ data: { messageId: message.id, emoji } });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Réaction impossible");
    }
  }

  async function onSaveEdit() {
    const body = editDraft.trim();
    if (!body) {
      toast.error("Message vide.");
      return;
    }
    try {
      await editMessage({ data: { messageId: message.id, body } });
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Modification impossible");
    }
  }

  const deleted = Boolean(message.deletedAt);

  return (
    <div className={cn("flex atlas-msg-in", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[min(100%,28rem)]", mine ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-[18px] px-3.5 py-2 text-sm leading-relaxed",
            mine
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-secondary text-foreground",
            deleted && "italic opacity-70",
            message.pending && "opacity-70",
          )}
        >
          {message.replyPreview ? (
            <p
              className={cn(
                "mb-1.5 border-l-2 pl-2 text-xs",
                mine ? "border-primary-foreground/40 text-primary-foreground/80" : "border-signal text-muted-foreground",
              )}
            >
              {message.replyPreview.body || "Message"}
            </p>
          ) : null}
          {deleted ? (
            "Message supprimé"
          ) : editing ? (
            <div className="space-y-2">
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-[var(--radius-sm)] bg-primary-foreground/10 px-2 py-1.5 text-sm outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="text-xs underline-offset-4 hover:underline"
                  onClick={() => setEditing(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="text-xs font-medium underline-offset-4 hover:underline"
                  onClick={() => void onSaveEdit()}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.mediaUrl ? (
                <button
                  type="button"
                  className="mb-1 block overflow-hidden rounded-[var(--radius-sm)]"
                  onClick={() => onImage(message.mediaUrl!)}
                >
                  <img
                    src={message.mediaUrl}
                    alt=""
                    className="max-h-64 max-w-full object-cover"
                  />
                </button>
              ) : null}
              {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
            </>
          )}
        </div>
        <div className={cn("mt-1 flex items-center gap-1.5 px-1", mine ? "justify-end" : "justify-start")}>
          {grouped.size > 0 ? (
            <div className="flex gap-1">
              {[...grouped.entries()].map(([emoji, info]) => (
                <button
                  key={emoji}
                  type="button"
                  className={cn(
                    "rounded-full bg-secondary px-1.5 text-xs tabular-nums",
                    info.mine && "ring-1 ring-signal",
                  )}
                  onClick={() => void onReact(emoji)}
                >
                  {emoji} {info.count}
                </button>
              ))}
            </div>
          ) : null}
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatClock(message.createdAt)}
            {message.editedAt ? " · modifié" : ""}
          </span>
          {mine && !deleted ? (
            read ? (
              <CheckCheck className="size-3.5 text-signal" aria-label="Lu" />
            ) : (
              <Check className="size-3.5 text-muted-foreground" aria-label="Envoyé" />
            )
          ) : null}
          {!deleted && !message.pending ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={mine ? "end" : "start"}>
                <DropdownMenuItem onSelect={onReply}>Répondre</DropdownMenuItem>
                {mine && message.type === "text" ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      setEditDraft(message.body);
                      setEditing(true);
                    }}
                  >
                    Modifier
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => undefined} className="p-0">
                  <span className="flex w-full items-center gap-1 px-2 py-1">
                    <Smile className="size-3.5" />
                    {REACTION_SET.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="grid size-7 place-items-center rounded-full hover:bg-secondary"
                        onClick={() => void onReact(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </span>
                </DropdownMenuItem>
                {mine ? (
                  <DropdownMenuItem onSelect={() => void onDelete()}>
                    Supprimer
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  );
}
