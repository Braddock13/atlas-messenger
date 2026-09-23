import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, Lock, Radio, ScanSearch } from "lucide-react";
import { AtlasMark } from "@/components/atlas/mark";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { isPending } = useCurrentUserState();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="atlas-grid pointer-events-none absolute inset-0 opacity-80" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <span className="inline-flex items-center gap-2">
          <AtlasMark className="size-7" />
          <span className="font-display text-lg font-semibold tracking-[-0.04em]">
            ATLAS
          </span>
        </span>
        <nav className="flex items-center gap-2">
          {isPending ? (
            <div className="h-11 w-24 animate-pulse rounded-[var(--radius-sm)] bg-secondary" />
          ) : (
            <>
              <SignedOut>
                <Button variant="ghost" asChild>
                  <Link to="/login">Connexion</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Créer un compte</Link>
                </Button>
              </SignedOut>
              <SignedIn>
                <Button asChild>
                  <Link to="/app">Ouvrir ATLAS</Link>
                </Button>
              </SignedIn>
            </>
          )}
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-16 px-5 pt-16 pb-24 md:grid-cols-[1.2fr_0.8fr] md:pt-24">
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-signal uppercase">
            Messagerie privée
          </p>
          <h1 className="mt-5 max-w-xl font-display text-5xl leading-[0.95] font-semibold tracking-[-0.05em] md:text-7xl">
            Le signal,
            <br />
            sans le bruit.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            ATLAS est une plateforme de communication précise : conversations
            privées, identité claire, architecture prête à grandir. Pas un clone.
            Un instrument.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <SignedOut>
              <Button size="lg" asChild>
                <Link to="/register">
                  Entrer
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">J’ai déjà un compte</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button size="lg" asChild>
                <Link to="/app">
                  Continuer
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </SignedIn>
          </div>
        </div>

        <aside className="self-end rounded-[var(--radius-xl)] border border-border bg-card p-6 shadow-[var(--shadow)]">
          <p className="font-display text-sm font-semibold tracking-[-0.02em]">
            Première version
          </p>
          <ul className="mt-5 space-y-4 text-sm">
            <Feature
              icon={<Lock className="size-4" />}
              title="Privé par construction"
              body="Chaque conversation n’existe que pour ses membres. Les lectures sont limitées."
            />
            <Feature
              icon={<Radio className="size-4" />}
              title="Temps réel sobre"
              body="Messages, accusés de lecture, réactions — sans surcharge visuelle."
            />
            <Feature
              icon={<ScanSearch className="size-4" />}
              title="Identité unique"
              body="Un identifiant, un profil, une recherche. Le graphe social viendra ensuite."
            />
          </ul>
        </aside>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground">
        {icon}
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-muted-foreground">{body}</span>
      </span>
    </li>
  );
}
