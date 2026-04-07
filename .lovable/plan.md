
# Contractor User Automation & Access Control

## Overview
Automate contractor worker lifecycle: auto-assign type, enforce project linkage, cap access at 3 months, auto-deactivate on expiry, and send expiry alerts.

---

## Phase 1: Form & Database Logic

### 1.1 Database Migration
- Add columns to `contractor_workers`:
  - `user_type` (text, default `'short_term_contractor'`)
  - `access_start_date` (date) — set on approval
  - `access_end_date` (date) — computed: MIN(project end date, approval + 3 months)
  - `approved_at` (timestamptz) — when worker is approved
  - `expiry_warning_sent_at` (timestamptz) — track 7-day warning
  - `expiry_final_warning_sent_at` (timestamptz) — track 1-day warning

### 1.2 Form Updates (`ContractorWorkerForm.tsx`)
- Auto-set `user_type = "short_term_contractor"` (read-only, visible but disabled)
- When project is selected, auto-fill:
  - Start Date = project's `start_date`
  - End Date = MIN(project's `end_date`, today + 3 months)
- Show info alert explaining the 3-month access cap rule
- Prevent manual override of user_type field

### 1.3 Database Trigger
- Create trigger `trg_enforce_contractor_access_duration` on `contractor_workers`:
  - On INSERT/UPDATE: if `user_type = 'short_term_contractor'`, enforce `access_end_date <= approved_at + 3 months`
  - On status change to `approved`: auto-set `approved_at = now()`, compute `access_end_date`

---

## Phase 2: Auto-Deactivation & Notifications

### 2.1 Edge Function: `check-contractor-expiry`
- Scheduled via pg_cron (runs daily)
- Queries workers where `access_end_date <= now()` and status is still active
- Auto-sets status to `suspended` / `inactive`
- Sends 7-day warning (where `access_end_date - 7 days <= now()` and no warning sent)
- Sends 1-day warning (where `access_end_date - 1 day <= now()` and no final warning sent)
- Notifications via existing WhatsApp + in-app notification system

### 2.2 Notification Recipients
- Worker (via mobile_number / WhatsApp)
- Company representative / supervisor (via existing contractor_representatives)

---

## Phase 3: Hook & Mutation Updates

### 3.1 Update `use-contractor-portal.ts`
- Include `user_type`, `access_start_date`, `access_end_date` in create mutation
- On approval action, auto-compute `access_end_date = MIN(project.end_date, approved_at + 90 days)`

---

## Files Modified

| File | Change |
|------|--------|
| Migration SQL | Add access control columns + trigger |
| `ContractorWorkerForm.tsx` | Auto user type, project date sync, 3-month cap display |
| `use-contractor-portal.ts` | Include new fields in mutation |
| `supabase/functions/check-contractor-expiry/index.ts` | New Edge Function for auto-deactivation + alerts |
| pg_cron job | Schedule daily expiry check |

## Technical Notes
- 3-month cap is enforced both in UI (form) and DB (trigger) — defense in depth
- Access end date = `LEAST(project_end_date, approved_at + interval '3 months')`
- Auto-deactivation is idempotent (safe to re-run)
- Existing WhatsApp utility (`wasender-whatsapp.ts`) used for notifications
