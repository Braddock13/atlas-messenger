import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/atlas/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchPeople, startDirectConversation } from "@/lib/atlas/api";

export const Route = createFileRoute("/app/search")({
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const trimmed = q.trim();
  const results = useQuery({
    queryKey: ["search", trimmed],
    queryFn: () => searchPeople({ data: { q: trimmed } }),
    enabled: trimmed.length >= 2,
  });
  const start = useMutation({
    mutationFn: (userId: string) => startDirectConversation({ data: { userId } }),
    onSuccess: (data) => {
      void navigate({
        to: "/app/c/$conversationId",
        params: { conversationId: data.id },
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Impossible de démarrer la conversation");
    },
  });

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col px-4 py-6 md:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
        Recherche
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nom ou identifiant, au moins 2 caractères.
      </p>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ex. ada"
          className="pl-9"
          autoFocus
        />
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-20 md:pb-6">
        {trimmed.length < 2 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="Trouver quelqu’un"
            description="Tapez un identifiant ou un nom pour démarrer une conversation."
          />
        ) : results.isPending ? (
          <p className="py-8 text-sm text-muted-foreground">Recherche…</p>
        ) : results.isError ? (
          <p className="py-8 text-sm text-destructive">Recherche impossible.</p>
        ) : (results.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="Aucun utilisateur trouvé"
            description="Essayez un autre identifiant."
          />
        ) : (
          <ul className="space-y-1">
            {(results.data ?? []).map((person) => (
              <li
                key={person.userId}
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-secondary"
              >
                <Avatar src={person.photoUrl} name={person.displayName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{person.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{person.username}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={start.isPending}
                  onClick={() => start.mutate(person.userId)}
                >
                  {start.isPending ? "Ouverture…" : "Écrire"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
