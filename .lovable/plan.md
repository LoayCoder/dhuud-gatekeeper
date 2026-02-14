

## Fix: Investigation Workspace - Restore Full Incident Selection and Investigation

### Problem
The `/incidents/investigate` route is currently pointing to `InvestigationWorkspaceDebug` -- a stripped-down debug page that only lists incidents without any selection or investigation functionality. This was likely left over from previous debugging.

### Root Cause
In `src/routes/incident.routes.tsx`, line 14:
```typescript
// The REAL workspace is commented out:
// const InvestigationWorkspace = lazyWithRetry(() => import("@/pages/incidents/InvestigationWorkspace"));

// The DEBUG version is active:
const InvestigationWorkspace = lazyWithRetry(() => import("@/pages/incidents/InvestigationWorkspaceDebug"));
```

### Fix (1 file, 1 line change)

**File: `src/routes/incident.routes.tsx`** (line 13-14)

Swap the import back to the real workspace:
- Uncomment line 13 (real workspace import)
- Comment out or remove line 14 (debug workspace import)

```typescript
const InvestigationWorkspace = lazyWithRetry(() => import("@/pages/incidents/InvestigationWorkspace"));
// const InvestigationWorkspace = lazyWithRetry(() => import("@/pages/incidents/InvestigationWorkspaceDebug"));
```

This restores:
- The Select dropdown for choosing incidents
- My Pending / All Incidents toggle
- Full investigation tabs (Overview, Evidence, Witnesses, RCA, Actions, Audit Log)
- Workflow cards, closure dialogs, and all investigation functionality

### Technical Details
- The real `InvestigationWorkspace.tsx` (1273 lines) is fully functional with all previous fixes applied (`.data` access, type casts, etc.)
- No other files need changes
- The debug file can remain in the codebase for future use but will not be served

