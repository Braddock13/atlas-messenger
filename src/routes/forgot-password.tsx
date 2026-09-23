import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthScreen, authErrorMessage } from "@/components/atlas/auth-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const reset = (
        authClient as typeof authClient & {
          requestPasswordReset?: (opts: {
            email: string;
            redirectTo?: string;
          }) => Promise<{ error?: { message?: string } | null }>;
          forgetPassword?: (opts: {
            email: string;
            redirectTo?: string;
          }) => Promise<{ error?: { message?: string } | null }>;
        }
      );
      const run =
        reset.requestPasswordReset ??
        reset.forgetPassword;
      if (!run) throw new Error("Réinitialisation indisponible.");
      const { error } = await run({
        email,
        redirectTo: "/reset-password",
      });
      if (error) throw error;
      setSent(true);
      toast.success("Si un compte existe, un e-mail a été préparé.");
    } catch (err) {
      toast.error(
        authErrorMessage(err) === "Une erreur est survenue."
          ? "La réinitialisation par e-mail n’est pas encore configurée sur ce déploiement."
          : authErrorMessage(err),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      title="Mot de passe oublié"
      subtitle="Indiquez l’e-mail du compte. Un lien de réinitialisation pourra être envoyé."
    >
      {sent ? (
        <p className="text-sm text-muted-foreground">
          Consultez votre boîte de réception. Si aucun e-mail n’arrive, le
          fournisseur d’envoi n’est pas encore branché sur ce déploiement.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Envoi…" : "Envoyer le lien"}
          </Button>
        </form>
      )}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </AuthScreen>
  );
}
