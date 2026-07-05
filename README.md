# Osusu Group

A small app to coordinate an 8-person osusu (rotating savings group): everyone registers, one member
is randomly picked as umpire once all 8 have joined, and the umpire runs a single random draw that
fixes everyone's contribution order. This app only tracks and coordinates — no money moves through it.

- `server/` — Express + TypeScript API (SQLite storage via Node's built-in `node:sqlite`)
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

### 2. Backend → Render
1. Go to [render.com](https://render.com) and sign in with GitHub.
2. New → Web Service → pick this repo. Render will detect `server/render.yaml` — use it, or set manually:
   - Root directory: `server`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
3. Set environment variables when prompted:
   - `ADMIN_PASSWORD` — the secret only Jude will use to reset the cycle
   - `JWT_SECRET` — Render can auto-generate this
   - `CORS_ORIGIN` — leave as `*` for now; tighten it to your Vercel URL after step 3
4. Deploy. Copy the resulting URL (e.g. `https://osusu-server.onrender.com`).

**Note on data persistence:** the free Render plan's disk is wiped on every redeploy (not on normal
restarts/sleep). That means member registrations reset if you push new server code. Fine for this
group-coordination use case; if you need the cycle to survive redeploys long-term, move to a hosted
database later.

### 3. Frontend → Vercel
```
cd web
npx vercel login
npx vercel --prod
```
When prompted, set the environment variable `VITE_API_URL` to your Render backend URL from step 2
(via `npx vercel env add VITE_API_URL production`, then redeploy with `npx vercel --prod`).

Vercel will give you the shareable link — that's what you send in the WhatsApp group.

### 4. Lock down CORS (optional but recommended)
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
