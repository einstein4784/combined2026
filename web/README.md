## Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind v4 styles
- MongoDB via Mongoose
- Cookie-based auth (signed JWT) with RBAC + audit logging

## Environment
Create a `.env.local` (not committed) with:
```
MONGODB_URI=<connection string with /CISLDB database name>
AUTH_SECRET=<long random string>
DEFAULT_ADMIN_EMAIL=admin@icinsurance.com
DEFAULT_ADMIN_PASSWORD=admin123
```

**Note**: The connection string should include the database name: `mongodb+srv://...@host.net/CISLDB?retryWrites=true&w=majority`

## Scripts
- `npm run dev` – local dev at http://localhost:3000
- `npm run build && npm start` – production build/serve
- `npm run lint` – lint
- `npm run seed:admin` – seed default admin + role permissions (requires env)

## App structure
- Auth routes: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Core CRUD: `/api/users`, `/api/customers`, `/api/policies`, `/api/payments`, `/api/receipts`
- Reporting: `/api/reports/cash`
- Dashboard data: `/api/dashboard`

UI pages live under `src/app/(protected)/*` with guarded layout + nav shell. Login is at `/login`.

## Deploying to Vercel
1) Set env vars in Vercel project: `MONGODB_URI`, `AUTH_SECRET`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`.
2) Build command `npm run build`, output `.next`.
3) Optionally add `npm run seed:admin` locally/one-off to ensure admin user exists in the target DB.
