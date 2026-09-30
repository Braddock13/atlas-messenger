import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthScreen, SocialAuth, authErrorMessage } from "@/components/atlas/auth-screen";
import { RedirectIfAuthed } from "@/components/atlas/guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailAuthFetchOptions, finishEmailAuth } from "@/lib/atlas/session";
import { authClient } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  return (
    <RedirectIfAuthed>
      <LoginForm />
    </RedirectIfAuthed>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        fetchOptions: emailAuthFetchOptions,
      });
      await finishEmailAuth(result);
      toast.success("Connexion réussie");
      await navigate({ to: "/app" });
    } catch (err) {
      toast.error(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen title="Connexion" subtitle="Retrouvez vos conversations.">
      <form className="space-y-4" onSubmit={onSubmit}>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <SocialAuth callbackURL="/app" errorCallbackURL="/login" />

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link to="/register" className="text-foreground underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </AuthScreen>
  );
}
