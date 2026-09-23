# ATLAS

Plateforme de communication privée, pensée pour durer et évoluer vers un réseau social. Première version : messagerie directe, identités uniques, lecture en temps réel.

## Produit

ATLAS n’est pas un clone de WhatsApp ou Messenger. L’interface est un instrument : sombre par défaut, typographie Syne / Manrope, surfaces calmes, zéro chrome superflu.

**MVP actuel**

- Inscription, connexion, déconnexion (e-mail + mot de passe, Google, X)
- Profil : nom, identifiant unique, bio, photo
- Recherche par nom ou identifiant
- Conversations privées 1:1
- Messages texte et images, réponses, réactions, modification, suppression
- Accusés d’envoi et de lecture, compteur non lus, pagination de l’historique
- Indicateur de frappe, masquage et notifications coupées par conversation
- Thème clair / sombre, mobile et desktop
- Notifications in-app
- Réglages de confidentialité (en ligne, dernière activité, nouveaux messages)

**Pas encore dans l’interface** (tables déjà prévues) : posts, commentaires, follows, signalements, admin, appels, messages vocaux.

La vérification d’e-mail et la réinitialisation du mot de passe ont leur écran. L’envoi réel d’e-mails dépend d’un fournisseur SMTP côté déploiement — sans lui, le compte reste utilisable, l’e-mail n’est pas bloquant.

## Stack

ATLAS tourne sur la stack de cette plateforme de déploiement :

| Couche | Technologie | Pourquoi |
| --- | --- | --- |
| App | TanStack Start + React 19 + TypeScript | Runtime / preview / Vercel de cette sandbox. Next.js n’est pas branchable ici. |
| UI | Tailwind CSS v4, Radix, composants propres | Design system unique, mobile-first |
| Auth | Better Auth (Google, X, e-mail/mot de passe) | Session réelle, y compris en preview. Firebase Auth n’émet pas la session Grok. |
| Données | Postgres (Neon en prod, PGLite en preview) | Persisté, requêtes bornées par `user_id` serveur. Firestore exigerait un jeton Firebase. |
| Médias MVP | Images compressées côté client | Pas de bucket ouvert. Storage Firebase est documenté pour plus tard. |
| Déploiement | Vercel | Preset Nitro déjà en place |

La configuration web Firebase du projet `atlas-16069` est conservée dans `src/firebase/config.ts`. Les règles strictes vivent dans `firebase/` pour une migration Cloud ultérieure. **Aucun service account, aucun secret serveur n’est dans le client.**

## Démarrage local

Dépendances déjà installées.

```bash
npm install
npm run dev
```

Compte e-mail : 8 caractères minimum. Un profil (identifiant unique) est créé à la première session.

```bash
npm run typecheck
npm run test
npm run build
```

## Données

Schéma dans `migrations/0002_atlas.sql` et `migrations/0003_atlas_chat.sql` :

- `profiles` — identité publique, confidentialité
- `conversations` + `conversation_members` — DM, `pair_key` unique, non lus
- `messages` + `message_reactions` — texte/image, réponse, suppression douce
- `notifications`
- `posts`, `comments`, `follows`, `reports` — réservés, non exposés

Chaque fonction serveur passe par `authMiddleware` et filtre sur `context.userId`. Un utilisateur ne lit et n’écrit que les conversations dont il est membre.

## Variables d’environnement

Ne pas commiter de fichier `.env`. En production (Vercel), renseigner :

| Variable | Où | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | serveur | Postgres (Neon recommandé) |
| `BETTER_AUTH_SECRET` | serveur | Secret de session (32+ caractères) |
| `BETTER_AUTH_URL` | serveur | URL publique de l’app, ex. `https://atlas-messenger.vercel.app` |
| `VITE_AUTH_ENABLED` | build | `"true"` |

Les clés Firebase web sont publiques (identifiant de projet, pas un secret).

Si vous branchez Firebase plus tard :

- `VITE_*` uniquement pour les clés web
- service account **uniquement** côté serveur, jamais dans le frontend

## Déploiement

### GitHub

Dépôt : [github.com/Braddock13/atlas-messenger](https://github.com/Braddock13/atlas-messenger)

### Vercel

Le build (`vite build` + migrations) cible déjà Vercel (`nitro` preset). Après connexion du dépôt :

1. Framework : Vite / TanStack Start
2. Build : `npm run build`
3. Ajouter `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `VITE_AUTH_ENABLED=true`
4. Chaque push sur `main` déclenche un déploiement

Sans `DATABASE_URL`, le build réussit (PGLite de secours) mais les données ne persistent pas en serverless — Neon est obligatoire en production.

## Structure

```
src/routes/           pages (landing, auth, app)
src/components/atlas  coque, chat, listes
src/components/ui     primitives
src/lib/atlas         types, API serveur, usernames
src/lib/auth          Better Auth (ne pas réécrire)
src/firebase          config web (migration)
firebase/             règles Firestore / Storage
migrations/           schéma Postgres
```

## Sécurité

- Pas de `allow read, write: if true`
- Identifiants uniques, recherche à 2 caractères minimum (pas d’énumération complète)
- Images : types jpeg/png/webp, compression et plafond de taille
- Messages : longueur max, appartenance obligatoire
- Sortie HTML via React (pas de HTML libre dans les messages)
