# Le Ré-seau — v3

Réseau social local pour l'Île de Ré. Réécriture complète qui corrige les bugs identifiés dans la v2 et ajoute les pages manquantes (À propos, Activités, Groupes de chat).

## 🛠️ Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth, base de données, storage, realtime)
- React Router

## 🚀 Installation

```bash
npm install
# ou
bun install
```

### 1. Créer un projet Supabase

Va sur [supabase.com](https://supabase.com), crée un nouveau projet (gratuit).

### 2. Exécuter le script SQL

Dans le Dashboard Supabase → **SQL Editor** → **New query**, colle tout le contenu de `supabase/migrations/001_init.sql` et exécute-le (bouton "Run").

Ce script crée :
- Les profils, messages privés
- Les groupes de chat (nouveau, corrige le bug "créer un groupe")
- Les salons de discussion persistants (corrige les messages qui disparaissaient)
- Le forum avec likes/commentaires persistants
- Les offres/demandes de services (avec suppression possible)
- Les activités (nouveau, avec photos et suppression)
- Les buckets de stockage pour les photos
- Une vue `site_stats` pour les vraies statistiques de la page d'accueil

### 3. Activer l'authentification Google (optionnel)

Dashboard Supabase → **Authentication** → **Providers** → **Google** → renseigne ton Client ID / Secret Google Cloud Console.

⚠️ Pense à ajouter l'URL de callback dans Google Cloud Console :
`https://<ton-projet>.supabase.co/auth/v1/callback`

### 4. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Remplis `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (Dashboard Supabase → Project Settings → API).

### 5. Lancer le projet

```bash
npm run dev
```

Le site est sur `http://localhost:8080`.

## 🐛 Bugs corrigés par rapport à la v2

| # | Bug | Fix |
|---|-----|-----|
| 1 | OAuth Google plantait sur "Deny" | Gestion de l'erreur `access_denied` dans l'URL de retour |
| 2 | Bouton retour "Qui sommes-nous" cassé | Page créée + `navigate(-1)` avec fallback vers l'accueil |
| 3 | Âge en lettres/négatif dans le profil | Validation stricte (chiffres only, 13-120 ans) |
| 4 | "Créer un groupe" ne marchait pas | Tables `chat_groups`/`chat_group_members` + UI fonctionnelle |
| 5 | Photos manquantes dans Activités | Page créée avec upload + fallback par catégorie |
| 6 | Âge négatif en créant une activité | Validation stricte (jamais négatif) |
| 7 | Impossible de supprimer ses annonces (jobs/activités) | Bouton supprimer + policy RLS `author_id = auth.uid()` |
| 8 | "7 personnes disponibles" = constante en dur | Vue SQL `site_stats` avec vrais comptages |
| 9 | Messages des salons perdus au refresh | Table `salon_messages` persistante + Realtime |
| 10 | Posts du forum mockés en dur | Table `forum_posts`/`forum_likes`/`forum_comments` réelles |
| 11 | Photo de profil par défaut = vraie photo trompeuse | Remplacée par une initiale stylisée |
| 12 | Nom vide / bio sans limite acceptés | Validation requise + `maxLength` |

## 📁 Structure

```
src/
  pages/          → Une page = une route
  components/     → Composants réutilisables (ProfileCard, BottomNav, ui/...)
  lib/            → auth-context, constants, utils, client Supabase
  integrations/supabase/ → client + types générés
supabase/migrations/001_init.sql → schéma complet à exécuter sur Supabase
```

## 📝 Notes

- Toutes les tables ont des policies **Row Level Security** : un utilisateur ne peut modifier/supprimer que ses propres données.
- Le chat privé et les groupes utilisent Supabase Realtime pour la réception instantanée des messages.
- Les photos (profil + activités) sont stockées dans deux buckets Storage publics en lecture, mais protégés en écriture (seul le propriétaire peut uploader dans son propre dossier).
