import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthScreen } from "@/components/atlas/auth-screen";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  return (
    <AuthScreen
      title="Vérifier l’e-mail"
      subtitle="Un lien de confirmation est envoyé lorsque le fournisseur d’e-mail du déploiement est configuré."
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        Vous pouvez déjà utiliser ATLAS. La vérification d’e-mail renforce la
        récupération de compte ; elle n’est pas bloquante tant que l’envoi
        d’e-mails n’est pas branché.
      </p>
      <Button asChild className="mt-6 w-full">
        <Link to="/app">Continuer vers ATLAS</Link>
      </Button>
    </AuthScreen>
  );
}
