# TestVault

Test management for teams that ship: write test cases, run them from the keyboard, attach evidence, and see exactly where a release stands.

Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma on Neon Postgres, Auth.js, and Vercel Blob.

## Local setup

You need Node 22 or newer.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file and fill it in:

   ```bash
   cp .env.example .env
   ```

   | Variable | What it is |
   | --- | --- |
   | `DATABASE_URL` | Postgres connection string, from Neon or a local database |
   | `AUTH_SECRET` | Random secret that signs sessions. Generate one with `npx auth secret` |
   | `BLOB_READ_WRITE_TOKEN` | Vercel Blob token. Everything but attachments works without it |
   | `NEXT_PUBLIC_APP_URL` | The app's base URL, such as `http://localhost:3000` |

   For a database with no account needed, start a local one with the first command below, then copy its `TCP` connection string (from the second) into `DATABASE_URL`:

   ```bash
   npx prisma dev -d -n testvault
   ```

   ```bash
   npx prisma dev ls
   ```

3. Create the tables and add demo data:

   ```bash
   npm run db:deploy
   ```

   ```bash
   npm run db:seed
   ```

   Sign in as `admin@testvault.dev`, `maya@testvault.dev` or `liam@testvault.dev`. On a local database the password for all three is `TestVault123!`. On any other database it's random and printed once when seeding, unless you set `SEED_PASSWORD`.

4. Start the app at <http://localhost:3000>:

   ```bash
   npm run dev
   ```

To skip the demo data, don't seed. The first person to sign up becomes the admin, and later signups start as viewers.

### Useful commands

| Command | What it does |
| --- | --- |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler |
| `npm run build` | Build for production |
| `npm run db:deploy` | Apply database migrations |
| `npm run db:seed` | Add demo data. It does nothing if users already exist |
| `npm run db:reset-seed` | **Delete all data** and reseed. Local use only |

`prisma migrate dev` needs a shadow database, which `prisma dev` can't provide. On that local database, generate a migration with `prisma migrate diff`, or point at a regular Postgres.

## Deploying to Vercel

1. Push the code to a GitHub repo.
2. Import the repo in Vercel.
3. In the project's Storage tab, connect a Neon Postgres database and create a Blob store. This adds `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` automatically.
4. Add `AUTH_SECRET` manually, using a new value from `npx auth secret`.
5. Run the migrations against the production database, then optionally the seed. Pull the production variables first:

   ```bash
   npx vercel env pull .env.production.local
   ```

   Then run these with those variables loaded, for example by copying the connection string into `DATABASE_URL` for the session. Migrations prefer `DATABASE_URL_UNPOOLED`, which the Neon integration also provides:

   ```bash
   npm run db:deploy
   ```

   ```bash
   npm run db:seed
   ```

   Seeding a production database creates demo accounts. Skip it for real use, and sign up to become the admin.

6. Deploy.

`DATABASE_URL` has to exist before the first build, because the build loads the database client.

## How it's organized

| Folder | Contents |
| --- | --- |
| `app/` | Routes. `(app)` has the shell, `(focus)` is execution mode, `(auth)` is sign-in |
| `components/` | `ui` (shared), `layout` (shell), `features` (by area) |
| `lib/` | `db`, `auth`, `validations`, `utils`, `constants` |
| `server/` | `actions` (mutations) and `queries` (reads) |
| `prisma/` | Schema, migrations and seed |

## Roles

Workspace admins can do everything in every project. Everyone else needs a project membership, and that membership's role applies. Every server action and route handler checks this on the server.

| Role | Can do |
| --- | --- |
| Viewer | Read only |
| Tester | Execute runs, record results, comment, upload attachments |
| Lead | Everything above, plus manage cases, runs, milestones and projects |
| Admin | Everything, including team management |

## Good to know

- **Attachments are public by URL.** Files live in a public Blob store under long, unguessable names. Anyone who has a link can open that file without signing in, so avoid uploading secrets.
- **Sign-in rate limit.** After 8 failed attempts on one email, sign-in for that email is refused for 15 minutes. Someone who knows an email could use this to lock that person out temporarily.
- **Adding users.** There's no email service, so an admin adds a user and passes on a one-time password. The user can change it in Settings.
- **Storage.** Settings shows usage and warns at 80% of 1 GB, the Blob free tier limit. It counts files recorded by the app.
