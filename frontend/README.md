# Brightloop frontend

React 19, TypeScript, Vite 8 and Tailwind 4. The visual design was produced with Google AI Studio and is preserved; this project adds routing, authentication and the first live backend integrations. See `IMPLEMENTATION_STATUS.md` for what is live and what is still demo data.

## Run locally

```bash
docker compose up -d        # from the repository root: API on 127.0.0.1:8000, Mailpit on :8025
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The dev server proxies `/api` to `http://127.0.0.1:8000`, so the browser only talks to its own origin and the backend needs no CORS configuration. Set `BRIGHTLOOP_API_TARGET` to proxy to a different backend. `VITE_API_BASE_URL` (default `/api/v1`) changes the API path prefix.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on port 5173 (fixed) |
| `npm run build` | Production build |
| `npm run lint` | `tsc --noEmit` (strict) |
| `npm test` | Unit and component tests (mocked `fetch`) |
| `npm run test:live` | Integration tests against the running backend through the dev proxy (needs `LIVE_PLATFORM_EMAIL/PASSWORD` and `LIVE_ADMIN_EMAIL/PASSWORD`; creates throwaway users and a business in the dev database) |

## Layout

```
src/api/        fetch client, error model, typed endpoint functions (only implemented endpoints)
src/auth/       session store, AuthProvider, route guards, permission helpers, navigation requirements
src/pages/      auth pages, platform businesses, team management, placeholders
src/workspace/  the original prototype shell for business users (tab based)
src/views/      original prototype pages (demo data)
src/adapters/   data-source seam for the demo modules
src/mock/       demo data and the demo-notice helper
design-reference/  AI Studio screenshots and design tokens (not served)
```
