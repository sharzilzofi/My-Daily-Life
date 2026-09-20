# Personal Life Dashboard — Phase 1

Project setup, authentication, layout, sidebar, and routing. Nutrition, Finance, Workout,
Time, Daily Log, Analytics, and the real Dashboard content are placeholders here — they're
built in the phases that follow.

## What's included in this phase

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Firebase Authentication: email/password login, registration, logout
- Protected route group `(app)` — redirects to `/login` if not signed in
- Sidebar + header shell with all planned nav sections (pages are placeholders)
- A starting `firestore.rules` file enforcing per-user data isolation

## Setup

1. **Install dependencies**
   ```
   npm install
   ```

2. **Create a Firebase project**
   - Go to https://console.firebase.google.com and create a project.
   - In the project, go to Build → Authentication → Sign-in method, and enable
     **Email/Password**.
   - Go to Build → Firestore Database → Create database (start in production mode).
   - Go to Project settings → General → Your apps → add a **Web app**, and copy
     the config values it gives you.

3. **Configure environment variables**
   ```
   cp .env.example .env.local
   ```
   Paste your Firebase web app config values into `.env.local`.

4. **Deploy the security rules** (requires the Firebase CLI: `npm install -g firebase-tools`)
   ```
   firebase login
   firebase init firestore   # point it at this project, keep the existing firestore.rules
   firebase deploy --only firestore:rules
   ```

5. **Run the dev server**
   ```
   npm run dev
   ```
   Visit http://localhost:3000 — you should land on `/login`. Register an account,
   and you'll be redirected into the dashboard shell with the sidebar and placeholder pages.

## Deploy to Vercel

Import this repository into Vercel and keep the default framework preset and build command.
Before deploying, add these six environment variables in **Project Settings → Environment
Variables** for the Production environment (and Preview if needed):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Use the values from the Firebase web app configuration, then redeploy. Firebase web config
values are intended for client-side use; access control is provided by Firebase Authentication
and Firestore Security Rules.

## Next phases

See the full architecture document (`personal-life-dashboard-plan.md`, shared earlier)
for the schema, types, and phase list. Phase 2 adds the real Firestore data layer and
settings; Phase 3 onward builds each module (Nutrition, Finance, Workout, Time, Daily
Log), then Dashboard and Analytics tie everything together.
