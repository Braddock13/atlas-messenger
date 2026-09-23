import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/atlas/theme";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { getMyProfile, updateMyProfile } from "@/lib/atlas/api";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import type { PrivacySettings } from "@/lib/atlas/types";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const user = useCurrentUser();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["me"],
    queryFn: () => getMyProfile(),
  });

  const savePrivacy = useMutation({
    mutationFn: (privacy: PrivacySettings) => updateMyProfile({ data: { privacy } }),
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });

  const privacy = profile.data?.privacy;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 pb-24 md:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
        Réglages
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Apparence, confidentialité, session.
      </p>

      <section className="mt-8 rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <h2 className="font-display text-sm font-semibold">Apparence</h2>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => setTheme("dark")}
          >
            <Moon className="size-4" />
            Sombre
          </Button>
          <Button
            type="button"
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => setTheme("light")}
          >
            <Sun className="size-4" />
            Clair
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <h2 className="font-display text-sm font-semibold">Confidentialité</h2>
        {profile.isPending || !privacy ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <PrivacyRow
              label="Afficher le statut en ligne"
              checked={privacy.showOnline}
              onCheckedChange={(showOnline) =>
                savePrivacy.mutate({ ...privacy, showOnline })
              }
            />
            <PrivacyRow
              label="Afficher la dernière activité"
              checked={privacy.showLastSeen}
              onCheckedChange={(showLastSeen) =>
                savePrivacy.mutate({ ...privacy, showLastSeen })
              }
            />
            <PrivacyRow
              label="Autoriser les nouveaux messages"
              checked={privacy.whoCanMessage === "everyone"}
              onCheckedChange={(on) =>
                savePrivacy.mutate({
                  ...privacy,
                  whoCanMessage: on ? "everyone" : "nobody",
                })
              }
            />
          </div>
        )}
      </section>

      <section className="mt-4 rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <h2 className="font-display text-sm font-semibold">Compte</h2>
        <p className="mt-2 text-sm text-muted-foreground">{user?.primaryEmail}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Vérification d’e-mail :{" "}
          {profile.data?.emailVerified ? "confirmé" : "en attente"}
          {!profile.data?.emailVerified ? (
            <>
              {" · "}
              <Link to="/verify-email" className="underline-offset-4 hover:underline">
                En savoir plus
              </Link>
            </>
          ) : null}
        </p>
        <div className="mt-4">
          {authEnabled ? (
            <Button type="button" variant="outline" onClick={() => void signOut()}>
              Se déconnecter
            </Button>
          ) : null}
        </div>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Le fil public, les communautés et l’administration arriveront plus tard.
        Aucun bouton inactif n’est exposé ici.
      </p>
    </div>
  );
}

function PrivacyRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
