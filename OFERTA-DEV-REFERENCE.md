# Oferta Suksesi — Dev Startup Reference

> **Paste this to Claude Code at the start of every session.**
> It prevents the recurring port mismatch / stale cache / broken images loop.

---

## 1. Service Ports (ACTUAL — ignore the project plan's 4000/4001/4002)

| Service             | Port   | Env Var              | Default in Code |
|---------------------|--------|----------------------|-----------------|
| **Web (Next.js)**   | `3000` | —                    | 3000            |
| **API (NestJS)**    | `3001` | `API_PORT`           | 3001            |
| **Image Service**   | `4001` | `IMAGE_SERVICE_PORT` | 4001            |
| **Notification Svc**| 4002   | —                    | 4002            |

## 2. Env Files — The Single Source of Truth

### `apps/web/.env.local`
```env
API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_IMAGE_URL=http://localhost:4001
```

### `apps/api/.env`
```env
API_PORT=3001
JWT_SECRET=fallback_secret
JWT_REFRESH_SECRET=fallback_refresh_secret
```

### `apps/image-service/.env` (if needed)
```env
IMAGE_SERVICE_PORT=4001
```

**⚠️ CRITICAL:** `NEXT_PUBLIC_*` vars are baked into the client bundle at build time.
Changing them requires deleting `.next` cache AND restarting the dev server.

## 3. Correct Startup Procedure

```bash
# 1. Kill any leftover processes
kill $(lsof -ti :3000) 2>/dev/null
kill $(lsof -ti :3001) 2>/dev/null
kill $(lsof -ti :4001) 2>/dev/null

# 2. Clear stale Next.js cache (do this EVERY TIME after env changes)
rm -rf apps/web/.next

# 3. Start all services via turbo
pnpm dev
```

## 4. Verify Everything Is Running

```bash
# Check ports are occupied
lsof -ti :3000 && echo "✓ Web OK"
lsof -ti :3001 && echo "✓ API OK"
lsof -ti :4001 && echo "✓ Image Service OK"

# Check API responds
curl -s 'http://localhost:3001/api/v1/listings?limit=1' | head -20

# Check image service serves files
curl -sI 'http://localhost:4001/uploads/' | head -3

# Check rendered page uses correct image URLs (should show localhost:4001)
curl -s 'http://localhost:3000' | grep -o 'localhost:[0-9]*/uploads' | sort -u
```

## 5. Common Problems & Fixes

### Images broken / not showing
1. **Check the URL port:** `curl -s 'http://localhost:3000' | grep -o 'localhost:[0-9]*/uploads' | sort -u`
   - If it says `4001` or anything other than `4001` → fix `apps/web/.env.local`, delete `.next`, restart
2. **Check files exist on disk vs DB paths:**
   ```bash
   # Get a URL from the API
   curl -s 'http://localhost:3001/api/v1/listings?limit=1' | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['images'][0]['url'])"
   # Then check if that file actually exists
   ls apps/image-service/uploads/<path-from-above>
   ```
   - If file not found → DB image records are stale, need to re-seed or re-sync

### Changes not reflecting after code edits
1. Stop turbo (Ctrl+C)
2. `rm -rf apps/web/.next`
3. `pnpm dev`

### API not responding (port empty)
- Check turbo output for NestJS compilation errors
- Run `cd apps/api && pnpm dev` standalone to see errors clearly

### Next.js Image optimization 500 errors
- Check `next.config.ts` has `remotePatterns` for `localhost` port `4001`
- Check the image service is actually running: `curl -sI http://localhost:4001/uploads/listings/...`

## 6. Project Structure Quick Reference

```
oferta-suksesi/
├─ apps/web/                  Next.js (:3000) — .env.local here
├─ apps/api/                  NestJS  (:3001) — .env here
├─ apps/image-service/        NestJS  (:4001) — uploads/ dir here
├─ apps/notification-service/ NestJS  (:4002)
├─ packages/shared/           Shared types
├─ packages/ui/               Shared components
├─ prisma/                    Schema + migrations
└─ docker-compose.yml         Docker setup
```

## 7. What to Tell Claude Code

When starting a new Claude Code session, say:

> "Read the file `OFERTA-SUKSESI-DEV-REFERENCE.md` in the project root before doing anything.
> The correct ports are: Web=3000, API=3001, Image Service=4001.
> NEXT_PUBLIC_IMAGE_URL must be http://localhost:4001.
> Always clear .next cache before restarting. Always verify ports with lsof after startup."

Or shorter:

> "Ports: web=3000, api=3001, images=4001. Always rm -rf apps/web/.next before restart.
> Never change ports in .env files without checking what the actual code defaults are in main.ts."
