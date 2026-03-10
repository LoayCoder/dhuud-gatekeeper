

# Fix: Support Page Translation Issues

## Problems Found

### 1. Arabic `support` namespace is a flat string
Line 5379 in `src/locales/ar/translation.json` has `"support": "الدعم"` instead of the full nested object matching the English structure (35+ keys for ticket creation, replies, statuses, categories, priorities).

### 2. Missing `adminSupport` keys in both EN and AR
15 keys used by `SLAIndicator`, `SLAConfigDialog`, `AdminTicketDetail`, and `AgentWorkloadCard` are missing from both translation files:

- `slaCompleted`, `slaOnTrack`, `slaAtRisk`, `dueIn`
- `firstResponseBreached`, `resolutionBreached`
- `configureSLA`, `slaHoursNote`
- `firstResponse`, `resolution`, `escalation`
- `respondedAt`, `resolved`
- `noAgents`, `open`

## Fix

### File 1: `src/locales/ar/translation.json`
- Replace flat `"support": "الدعم"` with full nested object (~35 keys) matching English structure
- Add 15 missing keys to `adminSupport`

### File 2: `src/locales/en/translation.json`
- Add 15 missing keys to `adminSupport`

No component changes needed.

