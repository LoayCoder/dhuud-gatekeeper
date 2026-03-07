

# Plan: Complete Arabic Translation Coverage for ar/translation.json

## Problem
English translation file has 9,876 lines while Arabic has 8,957 lines — approximately 900+ missing keys across all sections. These cause fallback to English or auto-generated labels at runtime.

## Approach
Enhance the existing `scripts/i18n-audit-fix.cjs` with a significantly expanded HSSE dictionary (~800+ additional terms) covering all domain-specific vocabulary found in the EN file, then have the user run it. The enhanced dictionary will include:

### Dictionary Expansion Areas (matching priority order)

1. **navigation, common, actions, auth** — Menu labels, form actions, authentication flows, MFA terms
2. **incidents, investigation, inspections** — HSSE event types/subtypes, root cause analysis, environmental impact, property damage, witness management, corrective actions, audit scoring
3. **security, guards, patrol** — Gate operations, QR scanner states, worker verification, command center, zones, shifts, roster, CCTV, emergency alerts
4. **contractors, gatePasses, ptw** — Worker bulk actions, material gate passes, contractor access validation, permit workflows, violation processing
5. **dashboard, analytics, reports** — KPIs, safety pyramid, Pareto/waterfall charts, executive report, data quality, caching, export
6. **settings, admin, userManagement** — Branding console, subscription plans, module management, user invitations, tenant management
7. **Remaining sections** — Risk assessments, observations AI analysis, positive observations, asset health, parts inventory, inspection schedules, location/boundary, quick observation, leaderboard

## File Changes

### 1. Update `scripts/i18n-audit-fix.cjs`
- Expand `DICTIONARY` from ~300 to ~1100+ entries covering:
  - Environmental terms: "Contaminant" → "ملوث", "Remediation" → "معالجة", "Spill" → "تسرب"
  - Investigation terms: "Witness" → "شاهد", "Root Cause" → "السبب الجذري", "Corrective Action" → "إجراء تصحيحي"
  - Risk terms: "Likelihood" → "الاحتمالية", "Hazard" → "الخطر", "Elimination" → "الإزالة"
  - Inspection terms: "Finding" → "نتيجة", "Non-Conformance" → "عدم مطابقة", "Compliance" → "الامتثال"
  - Security terms: "Geofence" → "نطاق جغرافي", "Checkpoint" → "نقطة تفتيش", "Blacklist" → "القائمة السوداء"
  - Contractor terms: "Induction" → "التعريف", "Gate Pass" → "تصريح دخول", "Violation" → "مخالفة"
  - Dashboard terms: "Pareto" → "باريتو", "Waterfall" → "الشلال", "KPI" → "مؤشر الأداء"
  - UI patterns: "No data available" → "لا تتوفر بيانات", "Loading..." → "جاري التحميل..."
- Expand `SENTENCE_DICT` with ~100+ full sentence patterns common in the EN file
- Add compound word translation (e.g., "Risk Assessment" as a unit, not word-by-word)

### 2. Update `src/locales/ar/translation.json` (via script execution)
- All ~900+ missing keys added with Arabic translations
- Empty values filled
- English-only values in AR replaced with Arabic
- Placeholder integrity verified
- RTL-breaking characters removed

## Execution
After updating the script, the user runs:
```
node scripts/i18n-audit-fix.cjs
```

The script will output a detailed report showing:
- Keys added per category (missing, empty, untranslated)
- Keys auto-translated vs needing manual review
- Final coverage percentage

## Technical Notes
- Dictionary-based translation preserves `{{variable}}` placeholders via regex extraction
- Existing Arabic translations are never overwritten
- The `parseJsonDedup` parser handles duplicate top-level keys in both files
- Keys that can't be dictionary-translated get EN as fallback and are flagged in `I18N_MANUAL_REVIEW.md`

