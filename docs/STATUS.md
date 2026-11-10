# Status and decisions

Keep short. Newest first.

## 2026-11-10 - branch `release-nov` (preview: https://release-nov--wheretopray.netlify.app)

Done
- Pages no longer crash without WebGL2 (home, place, add, gaps were blank on production). `src/lib/safeMap.ts`.
- Place pages say where data comes from: "From open map data" (access not confirmed) vs "Added by the community". The footer date is now "Imported" for open data, not "Last verified".
- Quick add collects visitor access, how to get in, opening hours, and an "authorised to invite visitors" tick. Private or permission-only spaces are rejected without it (server-side, `validatePayload`).
- Qibla page locates automatically when location permission is already granted.
- Lint ignores generated `.netlify/` output (was 11k false problems).

Verified: typecheck, lint, build, `scripts/validate-test.mts`, `mobile-ux-test` (6 viewports, also on the preview), `drag-pin-test`, `qibla-contribute-test`, no-WebGL load of 4 pages locally and on the preview.

Open (needs a decision)
- New submission fields live only in the submission payload. Showing them on place pages needs columns (`access`, `access_notes`, `opening_hours`) - a production DB migration.
- Every imported place has `status = verified`, which means "listed", not "access confirmed". A separate `access_confirmed_at` column would let the UI show confirmed places.
- Branches not merged: `data-expansion` (1 commit, 26 behind main), `hallmark-redesign`, `hallmark-white` (design experiments).

Decisions
- `~/mosque-locator` is an old static prototype. Do not deploy it to this site.
