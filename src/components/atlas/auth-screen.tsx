import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { AtlasMark } from "./mark";

export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="atlas-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-12">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 self-start">
          <AtlasMark className="size-7" />
          <span className="font-display text-xl font-semibold tracking-[-0.04em]">
            ATLAS
          </span>
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-[-0.04em]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

export function SocialAuth({
  callbackURL = "/app",
  errorCallbackURL = "/login",
}: {
  callbackURL?: string;
  errorCallbackURL?: string;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  if (!authEnabled) return null;

  return (
    <div className="mt-6 space-y-2">
      <p className="text-center text-xs tracking-[0.18em] text-muted-foreground uppercase">
        ou
      </p>
      {GROK_PROVIDERS.map((provider) => (
        <Button
          key={provider.providerId}
          type="button"
          variant="outline"
          className="w-full"
          disabled={pendingId !== null}
          onClick={() => {
            void (async () => {
              setPendingId(provider.providerId);
              try {
                await signIn(provider.providerId, {
                  callbackURL,
                  errorCallbackURL,
                });
              } catch (err) {
                toast.error(authErrorMessage(err));
                setPendingId(null);
              }
            })();
          }}
        >
          {pendingId === provider.providerId
            ? "Ouverture…"
            : `Continuer avec ${provider.label}`}
        </Button>
      ))}
    </div>
  );
}

export function authErrorMessage(error: unknown): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error ?? "");
  const lower = raw.toLowerCase();
  if (lower.includes("invalid email or password") || lower.includes("invalid password")) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (lower.includes("already") || lower.includes("exists")) {
    return "Un compte existe déjà avec cet e-mail.";
  }
  if (lower.includes("password") && (lower.includes("weak") || lower.includes("too short") || lower.includes("at least"))) {
    return "Mot de passe trop faible. 8 caractères minimum.";
  }
  if (lower.includes("invalid origin")) {
    return "Origine refusée. Rouvrez l’application depuis son adresse habituelle.";
  }
  if (lower.includes("unauthorized")) {
    return "Session expirée. Reconnectez-vous.";
  }
  if (lower.includes("pop-up") || lower.includes("popup")) {
    return "Autorisez les pop-ups pour continuer avec Google ou X.";
  }
  if (lower.includes("cancelled") || lower.includes("canceled")) {
    return "Connexion annulée.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Connexion impossible pour le moment. Réessayez.";
  }
  return raw || "Une erreur est survenue.";
}
