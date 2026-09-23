import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthScreen, authErrorMessage } from "@/components/atlas/auth-screen";
import { RedirectIfAuthed } from "@/components/atlas/guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  return (
    <RedirectIfAuthed>
      <RegisterForm />
    </RedirectIfAuthed>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
      const { error } = await authClient.signUp.email({
        email,
        password,
        name: name.trim() || email.split("@")[0] || "Membre ATLAS",
      });
      if (error) throw error;
      toast.success("Compte créé");
      await navigate({ to: "/app" });
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      title="Créer un compte"
      subtitle="Un identifiant unique vous sera attribué. Vous pourrez le modifier."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nom affiché</Label>
          <Input
            id="name"
            autoComplete="name"
            required
            maxLength={48}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
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
          {pending ? "Création…" : "S’inscrire"}
        </Button>
      </form>

      {authEnabled ? (
        <div className="mt-6 space-y-2">
          <p className="text-center text-xs tracking-[0.18em] text-muted-foreground uppercase">
            ou
          </p>
          {GROK_PROVIDERS.map((p) => (
            <Button
              key={p.providerId}
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void signIn(p.providerId, { callbackURL: "/app" })}
            >
              Continuer avec {p.label}
            </Button>
          ))}
        </div>
      ) : null}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthScreen>
  );
}
