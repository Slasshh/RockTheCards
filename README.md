This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Prisma

Les commandes `db:dev:*` chargent exclusivement `.env` :

```bash
bun run db:dev:generate
bun run db:dev:migrate:baseline
bun run db:dev:migrate -- --name nom_migration
bun run db:dev:migrate:create -- --name nom_migration
bun run db:dev:migrate:status
bun run db:dev:push
bun run db:dev:seed
bun run db:dev:studio
bun run db:dev:validate
```

En production, cette commande applique toutes les migrations présentes dans
l'image Docker avec `.env.production`. Elle réutilise l'image existante et ne la
construit que si elle est absente :

```bash
make migrate
```

Pour reconstruire une seule fois la nouvelle version, appliquer ses migrations,
puis redémarrer l'application :

```bash
make deploy
```

`make baseline` s'exécute une seule fois sur une ancienne base créée auparavant
avec `db push`. Cette commande enregistre la migration de référence sans
supprimer les tables ni leurs données.

Pour la première bascule d'une production existante vers les migrations :

```bash
make baseline
make deploy
```

Après cette première bascule, les déploiements suivants utilisent uniquement
`make deploy`.

## Google Agenda

Les réservations payées avec un créneau valide peuvent être ajoutées
automatiquement à l'agenda administrateur depuis le webhook Stripe.

1. Activer Google Calendar API dans le projet Google Cloud.
2. Configurer l'écran de consentement OAuth et créer un client OAuth 2.0 de
   type « Application Web ».
3. Pour un compte Google externe, passer l'application OAuth en production afin
   que le `refresh_token` ne soit pas limité à sept jours.
4. Ajouter l'identifiant et le secret OAuth dans `.env.production` :

```dotenv
GOOGLE_CALENDAR_TIME_ZONE="Europe/Paris"
GOOGLE_OAUTH_CLIENT_ID="client-id.apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="secret-oauth"
```

5. Appliquer les migrations Prisma avec `make migrate`.
6. Ouvrir « Google Agenda » dans le panel admin et ajouter l'URI affichée aux
   URI de redirection autorisées du client OAuth Google.
7. Cliquer sur « Connecter Google Agenda » et autoriser le compte Google
   administrateur.

Le `refresh_token` est récupéré automatiquement, chiffré avec une clé dérivée de
`NEXTAUTH_SECRET`, puis conservé en base. Il n'est jamais envoyé au navigateur.
L'agenda principal du compte autorisé reçoit les événements. Le client qui
commande n'est jamais connecté à Google Agenda et n'est pas ajouté comme invité.
Un événement utilise un identifiant dérivé de la session Stripe afin que les
nouvelles tentatives du webhook ne créent pas de doublon.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
