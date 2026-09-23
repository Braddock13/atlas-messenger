import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthScreen, authErrorMessage } from "@/components/atlas/auth-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setPending(true);
    try {
      const reset = authClient as typeof authClient & {
        resetPassword: (opts: { newPassword: string }) => Promise<{
          error?: { message?: string } | null;
        }>;
      };
      const { error } = await reset.resetPassword({ newPassword: password });
      if (error) throw error;
      toast.success("Mot de passe mis à jour");
      await navigate({ to: "/login" });
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe d’au moins 8 caractères."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </AuthScreen>
  );
}
