# Set2Go Cloud Compatibility & Production Testing Analysis

## Executive Summary

To enable private development testing of Set2Go Cloud on the live domain (`https://djhq.app`) while preserving strict security boundaries, this document reviews existing cloud restrictions and details the minimal safe changes required.

Set2Go Cloud remains a **private development feature**, not a public product release. Cloud processing and ZIP delivery are not yet implemented.

---

## 1. Baseline Review of Restrictions

Previously, Set2Go Cloud staging was hardcoded to `http://127.0.0.1:3000` and `NODE_ENV === 'development'`. Specifically:

1. **Product Entitlement (`lib/products/access.ts` & `lib/products/server.ts`):**
   - Required `development === true` and `userId === SET2GO_DEV_CLOUD_USER_ID`.
   - In production (`NODE_ENV === 'production'`), `development` evaluated to `false`, causing all requests to `/set2go` to yield a `404 Not Found`.

2. **Route Feature Gate (`app/set2go/page.tsx`):**
   - Checked `localOrigin` strictly enforcing `protocol === 'http:'` and hostname in `['localhost', '127.0.0.1', '[::1]']`.
   - In production or over HTTPS, `cloudEnabled` evaluated to `false`.

3. **Cloud Upload Authorization (`lib/set2go/cloud/dev-access.mjs`):**
   - Required `env.NODE_ENV === 'development'`, `env.SET2GO_DEV_CLOUD_UPLOAD === 'enabled'`, and `protocol === 'http:'` on loopback hostnames.
   - Enforced exact equality of `Origin` header and URL origin with `SET2GO_DEV_CLOUD_ORIGIN`.

4. **Storage Adapter Initialization (`lib/set2go/cloud/r2.mjs`):**
   - `developmentR2FromEnv` threw `'Cloud uploads disabled'` if `NODE_ENV !== 'development'`.

5. **Cloudflare R2 CORS Policy (`docs/set2go/r2-development-cors.json`):**
   - Allowed origins contained only `["http://127.0.0.1:3000"]`.
   - Direct browser-to-R2 presigned PUT/HEAD requests from `https://djhq.app` would be rejected by CORS preflight.

---

## 2. Security Requirements & Invariants

All changes adhere to the following security requirements:

1. **Strict Server-Side Authentication:** All endpoints continue to verify session authentication using Supabase server client `auth.getUser()`. Client-side claims and unauthenticated requests are rejected.
2. **Explicit User Authorization:** Only the specific UUID allowlisted in `SET2GO_DEV_CLOUD_USER_ID` is granted access to the Set2Go product route and upload endpoints.
3. **No Exposure to Ordinary DJHQ Visitors:** Ordinary users (authenticated or anonymous) receive `404 Not Found` at `/set2go` and `404 Not Found` on `/api/set2go/cloud`.
4. **Never Trust Client Identifiers:** The owner ID is obtained solely from `auth.getUser()`, never from request bodies, headers, or query parameters.
5. **Private R2 Access:** Bucket remains strictly private; only time-bounded (300s TTL) presigned URLs for specific object keys are provided to authorized users.
6. **Exact Allowed Origins:**
   - Development: `http://127.0.0.1:3000` (and loopback addresses).
   - Production / Private Testing: Exact `https://djhq.app`. No wildcards, HTTP in production, or external origins permitted.
7. **HTTPS Presigned Requests:** Presigned URLs use Cloudflare R2 HTTPS endpoints (`https://<account>.r2.cloudflarestorage.com`), and browser uploads transmit securely over TLS.
8. **Preserve Local Development:** Existing localhost development workflow and tests remain fully functional.
9. **Fail-Closed Private Testing Gate:** A separate explicit flag `SET2GO_PRIVATE_TESTING=enabled` is required to activate private testing in production. If missing or disabled, production requests fail closed.

---

## 3. Minimal Changes Implemented

### A. R2 CORS Policy (`docs/set2go/r2-development-cors.json`)
Updated allowed origins to include `https://djhq.app`:
```json
[
  {
    "AllowedOrigins": [
      "http://127.0.0.1:3000",
      "https://djhq.app"
    ],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

### B. Product Access Entitlement (`lib/products/access.ts` & `lib/products/server.ts`)
- Added `privateTesting` parameter to `AccessFacts`.
- Set2Go entitlement is authorized if `(facts.development || facts.privateTesting === true)` AND `facts.userId === facts.set2goDeveloperId`.
- In `server.ts`, `privateTesting` is driven by `process.env.SET2GO_PRIVATE_TESTING === 'enabled'`.

### C. Set2Go Page Cloud Flag (`app/set2go/page.tsx`)
- Validates origin: in development, allows loopback origins; in production with private testing enabled, allows exact `https://djhq.app`.
- Enables cloud UI only when authenticated user ID matches `SET2GO_DEV_CLOUD_USER_ID`, storage is fully configured, and private testing or dev mode is active.

### D. Cloud API Route Authorization Guard (`lib/set2go/cloud/dev-access.mjs`)
- Validates `(isDev || isPrivateTesting) && SET2GO_DEV_CLOUD_UPLOAD === 'enabled'`.
- Validates origin against exact allowed origins (`http://127.0.0.1:3000` in dev, `https://djhq.app` in private testing).
- Disallows insecure HTTP origins in production.
- Strictly matches `request.headers.get('origin')` and `request.url` origin.

### E. Storage Factory (`lib/set2go/cloud/r2.mjs`)
- `developmentR2FromEnv` allows initialization when `SET2GO_PRIVATE_TESTING === 'enabled'` alongside `SET2GO_UPLOAD_MODE` (`r2-development` or `r2-private-testing`).
- Continues to throw `'Cloud uploads disabled'` if unconfigured or in standard production mode without the private testing gate.
