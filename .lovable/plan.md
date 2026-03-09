

## Problem

The Deno bundler that deploys edge functions cannot parse `catch (error: unknown)` — it expects plain `catch (error)`. There are 230 occurrences across 43 edge function files, all blocking deployment.

## Fix

Replace every `catch (error: unknown)` with `catch (error)` in all 43 edge function files under `supabase/functions/`.

The logic remains identical since each function already uses `error instanceof Error` checks for safe access.

## Files to modify (all under `supabase/functions/`)

1. `asset-maintenance-escalation/index.ts`
2. `send-contractor-id-card/index.ts`
3. `asset-expiry-alerts/index.ts`
4. `send-onesignal-notification/index.ts`
5. `email-retry-processor/index.ts`
6. `send-whatsapp-template/index.ts`
7. `seed-test-observations/index.ts`
8. `send-ptw-email/index.ts`
9. `induction-expiry-alerts/index.ts`
10. `send-email-template/index.ts`
11. `acknowledge-induction/index.ts`
12. `inspection-reminders/index.ts`
13. `send-action-email/index.ts`
14. `send-bulk-induction/index.ts`
15. `send-invitation-email/index.ts`
16. All remaining files from the 43 matched

Each edit is a simple text replacement: `catch (error: unknown)` → `catch (error)`. No logic changes.

