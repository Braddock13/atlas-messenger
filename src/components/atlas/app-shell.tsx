import type { ReactNode } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { MessageSquare, Search, Settings, UserRound } from "lucide-react";
import { AtlasMark } from "@/components/atlas/mark";
import { ConversationList } from "@/components/atlas/conversation-list";
import { RequireAuth } from "@/components/atlas/guard";
import { NotifyBell } from "@/components/atlas/notify-bell";
import { useHeartbeat } from "@/hooks/use-heartbeat";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { user, isPending } = useCurrentUserState();
  useHeartbeat(Boolean(user) && !isPending);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isThread = pathname.startsWith("/app/c/");
  const isInbox = pathname === "/app" || isThread;

  return (
    <RequireAuth>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <aside className="hidden w-[72px] shrink-0 flex-col items-center border-r border-border py-4 md:flex">
          <Link to="/app" className="mb-6" aria-label="ATLAS">
            <AtlasMark className="size-8" />
          </Link>
          <nav className="flex flex-1 flex-col items-center gap-1">
            <NavIcon to="/app" label="Messages" icon={<MessageSquare className="size-5" />} active={isInbox} />
            <NavIcon to="/app/search" label="Recherche" icon={<Search className="size-5" />} active={pathname.startsWith("/app/search")} />
            <NavIcon to="/app/profile" label="Profil" icon={<UserRound className="size-5" />} active={pathname.startsWith("/app/profile")} />
            <NavIcon to="/app/settings" label="Réglages" icon={<Settings className="size-5" />} active={pathname.startsWith("/app/settings")} />
          </nav>
          <NotifyBell />
        </aside>

        <section
          className={cn(
            "w-full shrink-0 border-r border-border md:w-[340px]",
            isThread ? "hidden md:flex md:flex-col" : isInbox ? "flex flex-col" : "hidden md:flex md:flex-col",
          )}
        >
          <ConversationList />
        </section>

        <main
          className={cn(
            "min-w-0 flex-1",
            isInbox && !isThread ? "hidden md:block" : "block",
          )}
        >
          <Outlet />
        </main>

        {!isThread ? (
          <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
            <MobileTab to="/app" label="Messages" icon={<MessageSquare className="size-5" />} active={isInbox} />
            <MobileTab to="/app/search" label="Recherche" icon={<Search className="size-5" />} active={pathname.startsWith("/app/search")} />
            <MobileTab to="/app/profile" label="Profil" icon={<UserRound className="size-5" />} active={pathname.startsWith("/app/profile")} />
            <MobileTab to="/app/settings" label="Réglages" icon={<Settings className="size-5" />} active={pathname.startsWith("/app/settings")} />
          </nav>
        ) : null}
      </div>
    </RequireAuth>
  );
}

function NavIcon({
  to,
  label,
  icon,
  active,
}: {
  to: "/app" | "/app/search" | "/app/profile" | "/app/settings";
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={cn(
        "grid size-11 place-items-center rounded-[var(--radius-sm)]",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {icon}
    </Link>
  );
}

function MobileTab({
  to,
  label,
  icon,
  active,
}: {
  to: "/app" | "/app/search" | "/app/profile" | "/app/settings";
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
