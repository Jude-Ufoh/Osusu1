# Osusu Group

A small app to coordinate an 8-person osusu (rotating savings group): everyone registers, one member
is randomly picked as umpire once all 8 have joined, and the umpire runs a single random draw that
fixes everyone's contribution order. This app only tracks and coordinates — no money moves through it.

- `server/` — Express + TypeScript API (SQLite dialect storage via `@libsql/client`; local file by
  default, hosted Turso in production — see deploy step 2)
- `web/` — React + TypeScript web app (Vite), meant to be shared as a link (e.g. over WhatsApp)

## Local development

**Backend**
```
cd server
cp .env.example .env      # then edit ADMIN_PASSWORD and JWT_SECRET in .env
npm install
npm run dev                # http://localhost:4000
```

**Frontend** (in a second terminal)
```
cd web
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:5173
```

## Deploying so it's a shareable link

### 1. Push this repo to GitHub
```
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

### 2. Database → Turso (required for data to survive)
Render's free plan has no persistent disk. It's not just redeploys that wipe local files — the
free instance also **spins down after ~15 minutes of no traffic** and boots a fresh container on
the next request, which wipes any local SQLite file too. For a group that registers sporadically
over hours/days, that means registrations can vanish with no redeploy and no admin action at all.

To make the cycle durable, point the server at a hosted [Turso](https://turso.tech) database
(free tier, same SQLite dialect) instead of local disk:
1. Sign up at turso.tech (or `npx @tursodatabase/cli auth login`).
2. Create a database: `turso db create osusu`.
3. Get the connection URL: `turso db show osusu --url`.
4. Create an auth token: `turso db tokens create osusu`.
You'll set both as environment variables on Render in the next step. If `TURSO_DATABASE_URL` is
left unset, the server falls back to a local SQLite file — fine for local dev, not for production.

### 3. Backend → Render
1. Go to [render.com](https://render.com) and sign in with GitHub.
2. New → Web Service → pick this repo. Render will detect `server/render.yaml` — use it, or set manually:
   - Root directory: `server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
3. Set environment variables when prompted:
   - `ADMIN_PASSWORD` — the secret only Jude will use to reset the cycle
   - `JWT_SECRET` — Render can auto-generate this
   - `CORS_ORIGIN` — leave as `*` for now; tighten it to your Vercel URL after step 4
   - `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — from step 2
4. Deploy. Copy the resulting URL (e.g. `https://osusu-server.onrender.com`).

### 4. Frontend → Vercel
```
cd web
npx vercel login
npx vercel --prod
```
When prompted, set the environment variable `VITE_API_URL` to your Render backend URL from step 3
(via `npx vercel env add VITE_API_URL production`, then redeploy with `npx vercel --prod`).

Vercel will give you the shareable link — that's what you send in the WhatsApp group.

### 5. Lock down CORS (optional but recommended)
Once you have the Vercel URL, go back to Render's environment variables and set `CORS_ORIGIN` to
that exact URL, then redeploy the backend.

## How it works
- Each of the 8 members registers with a name and a 4-digit PIN.
- Until all 8 have registered, everyone sees "You will know your position when everyone has registered."
- The moment the 8th person registers, the server randomly picks one member as the umpire.
- The umpire sees a "Run Assignment" button — tapping it randomly assigns positions 1–8. This can only
  happen once; afterward, everyone who opens the app sees the same fixed order.
- The member named "Jude" has a hidden admin option (only visible on Jude's own screen) to reset the
  whole cycle with a separate admin password, clearing all registrations for a fresh round.

## Known limitations
- A 4-digit PIN is low-entropy — fine for a small trusted friend group, not meant for high-security use.
- Weekly contribution tracking/reminders are intentionally not built yet.
