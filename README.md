# Le Ré-seau

Réseau social communautaire pensé pour les habitants et visiteurs de l'Île de Ré. La plateforme permet de se connecter avec les gens du coin, d'échanger sur des salons de discussion thématiques, d'organiser des activités locales et de s'entraider via un espace d'offres et de demandes de services.

## Fonctionnalités

- **Profils & authentification** — inscription par email ou via Google
- **Messagerie privée** — conversations en temps réel entre membres
- **Groupes de discussion** — création de groupes de chat autour d'intérêts communs
- **Salons thématiques** — espaces de discussion persistants par sujet
- **Fil communautaire** — publications, likes et commentaires
- **Activités locales** — création et découverte d'événements avec photos
- **Petites annonces** — offres et demandes de services entre voisins
- **Carte interactive** — localisation des activités et des membres sur l'île
- **Modération** — signalement, blocage et outils d'administration
- **Conformité RGPD** — mentions légales, politique de confidentialité, conditions d'utilisation

## Stack technique

- **Frontend** — React 18, TypeScript, Vite
- **UI** — Tailwind CSS, shadcn/ui (Radix UI)
- **Backend** — Supabase (authentification, base de données PostgreSQL, stockage, temps réel)
- **Formulaires & validation** — React Hook Form, Zod
- **Gestion des données** — TanStack Query
- **Carte** — Leaflet / React Leaflet
- **Routing** — React Router

## Sécurité

Toutes les données sont protégées par des policies **Row Level Security** au niveau de la base : chaque utilisateur ne peut consulter ou modifier que ce qui le concerne. Les photos (profils, activités) sont stockées dans des espaces isolés par utilisateur, avec un accès en écriture restreint au propriétaire.
