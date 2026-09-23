import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listConversations, listNotifications, markNotificationsRead } from "@/lib/atlas/api";
import { formatInboxTime } from "@/lib/atlas/time";

export function NotifyBell({ align = "center" }: { align?: "start" | "center" | "end" }) {
  const queryClient = useQueryClient();
  const notes = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 8000,
  });
  const unread = (notes.data ?? []).filter((n) => !n.read).length;
  const inbox = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
    refetchInterval: 8000,
  });
  const inboxUnread = (inbox.data ?? []).reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unread > 0) {
          void markNotificationsRead().then(() =>
            queryClient.invalidateQueries({ queryKey: ["notifications"] }),
          );
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unread + inboxUnread > 0 ? (
            <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align={align} className="w-72">
        {(notes.data ?? []).length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Aucune notification</p>
        ) : (
          (notes.data ?? []).slice(0, 8).map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <Link
                to={item.conversationId ? "/app/c/$conversationId" : "/app"}
                params={item.conversationId ? { conversationId: item.conversationId } : undefined}
                className="flex flex-col items-start gap-0.5"
              >
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {item.body} · {formatInboxTime(item.createdAt)}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
