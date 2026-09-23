import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { Search, VolumeX } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/atlas/empty-state";
import { NotifyBell } from "@/components/atlas/notify-bell";
import { PresenceDot } from "@/components/atlas/presence";
import { Skeleton } from "@/components/ui/skeleton";
import { listConversations } from "@/lib/atlas/api";
import { formatInboxTime } from "@/lib/atlas/time";
import { cn } from "@/lib/utils";

export function ConversationList() {
  const params = useParams({ strict: false }) as { conversationId?: string };
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
    refetchInterval: 4000,
  });

  const items = useMemo(() => {
    const all = query.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (item) =>
        item.peer.displayName.toLowerCase().includes(needle) ||
        item.peer.username.toLowerCase().includes(needle) ||
        (item.lastMessageText ?? "").toLowerCase().includes(needle),
    );
  }, [query.data, q]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h1 className="font-display text-xl font-semibold tracking-[-0.03em]">
          Messages
        </h1>
        <div className="flex items-center">
          <span className="md:hidden">
            <NotifyBell align="end" />
          </span>
          <Link
            to="/app/search"
            className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Rechercher"
          >
            <Search className="size-5" />
          </Link>
        </div>
      </div>

      {(query.data ?? []).length > 4 ? (
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrer"
              className="h-10 w-full rounded-[var(--radius-sm)] border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-20 md:pb-3">
        {query.isPending ? (
          <div className="space-y-2 px-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : query.isError ? (
          <p className="px-4 py-8 text-sm text-destructive">
            Impossible de charger les conversations.
          </p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title={q.trim() ? "Aucun résultat" : "Aucune conversation"}
            description={
              q.trim()
                ? "Aucun fil ne correspond à ce filtre."
                : "Recherchez un identifiant pour écrire à quelqu’un."
            }
            action={
              q.trim() ? null : (
                <Link
                  to="/app/search"
                  className="mt-1 text-sm font-medium underline-offset-4 hover:underline"
                >
                  Trouver quelqu’un
                </Link>
              )
            }
          />
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = params.conversationId === item.id;
              return (
                <li key={item.id}>
                  <Link
                    to="/app/c/$conversationId"
                    params={{ conversationId: item.id }}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-colors",
                      active ? "bg-secondary" : "hover:bg-secondary/70",
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar src={item.peer.photoUrl} name={item.peer.displayName} />
                      <PresenceDot
                        isOnline={item.peer.isOnline}
                        lastSeen={item.peer.lastSeen}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-medium">
                          {item.peer.displayName}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {formatInboxTime(item.lastMessageAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-muted-foreground">
                          {item.peerTyping
                            ? "écrit…"
                            : item.lastMessageText || "Nouvelle conversation"}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {item.isMuted ? (
                            <VolumeX className="size-3.5 text-muted-foreground" aria-label="Muet" />
                          ) : null}
                          {item.unreadCount > 0 ? (
                            <Badge>{item.unreadCount > 9 ? "9+" : item.unreadCount}</Badge>
                          ) : null}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
