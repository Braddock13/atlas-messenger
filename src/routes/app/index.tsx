import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/atlas/empty-state";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  component: InboxEmpty,
});

function InboxEmpty() {
  return (
    <div className="hidden h-full md:block">
      <EmptyState
        icon={<MessageSquare className="size-5" />}
        title="Sélectionnez une conversation"
        description="Ou cherchez un identifiant pour en ouvrir une nouvelle."
        action={
          <Button variant="outline" asChild>
            <Link to="/app/search">Rechercher</Link>
          </Button>
        }
      />
    </div>
  );
}
