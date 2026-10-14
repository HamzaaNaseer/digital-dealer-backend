# Context

This is the backend for "Luna," a B2B landscape/hardscape materials dealer portal, built for an Upwork client engagement. It was extracted from a monorepo (`digital-dealer-core`, owned by the client under `yash-6ix` on GitHub) into this standalone repo after the client's Heroku app was deleted and broke the live deployment. This repo is deployed to Heroku under the client's own Heroku account/login (app name `digital-dealer-backend`), not the developer's — the GitHub repo itself is under the developer's own account.

## Stack
- Express + Mongoose/MongoDB, TypeScript (ESM), JWT auth, bcryptjs, Resend for email
- Connects to the client's production MongoDB Atlas cluster via `MONGODB_URI`
- Paired with a separate frontend repo (`digital-dealer-frontend`), deployed on Vercel

## Deployment
- Heroku, connected to this GitHub repo with Automatic Deploys enabled on `main`
- `Procfile`: `web: npm run start`
- `heroku-postbuild` runs `npm run build` (tsc) before boot
- Required config vars on Heroku (Settings → Config Vars): `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `RESEND_FROM`, `QUOTE_NOTIFICATION_EMAIL`
- `CORS_ORIGIN` must be a non-empty value matching the deployed frontend's URL (comma-separate for multiple origins) — an empty string here passes Heroku's "is it set" check but still throws `Missing required environment variable` at boot, since `src/config/env.ts` validates for truthiness, not just presence
- `RESEND_FROM` must not include literal surrounding quote characters when set via the Heroku dashboard (unlike a `.env` file, Heroku config vars don't strip them)
- Don't set `PORT` — Heroku assigns it automatically

## Known build quirk
- `tsconfig.json` excludes `src/scripts` from the production build. The seed scripts (`seed-products.ts` etc.) import `src/data/product-catalog.seed.ts`, a gitignored file containing confidential supplier pricing data transcribed from client-provided PDFs. That file is never committed, so a Heroku build that tries to type-check `src/scripts` fails with `Cannot find module`. The compiled server (`dist/index.js`) never depends on `src/scripts`, so excluding it from `tsc` is safe. Local seeding still works via `npm run seed:products` (uses `tsx`, which ignores tsconfig excludes) as long as the gitignored data file exists on disk locally.
- `src/data/raw/*.tsv` (raw price-list transcriptions) and `src/data/product-catalog.seed.ts` are intentionally untracked for the same confidentiality reason. If reseeding is ever needed from scratch, those files need to be regenerated or copied in from the original `digital-dealer-core` monorepo checkout.

## Product catalog
- The product catalog is being rebuilt from an updated source file; existing products will be removed and re-added. Don't assume the current `Category`/`Product` data or seed scripts reflect what's about to exist.
