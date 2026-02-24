

# Fix: UI Cleanup for UnifiedTimelineTracker + Build Errors

## Part 1: Build Error Fixes (4 errors)

### 1a. Edge Function TypeScript errors (3 errors in `hsse-cron/index.ts`)
The `error` and `e` variables in catch blocks are typed as `unknown` in strict TypeScript/Deno. Fix by casting:

- **Line 39**: `(error as Error).message`
- **Line 108**: `(e as Error).message`  
- **Line 185**: `(e as Error).message`

### 1b. CurrentOwnerCard type mismatch (line 63)
Comparing `RoleCategory` (which has values: `internal | contractor | hsse | warning | system`) to `'critical'` which doesn't exist in the union. Change `'critical'` to `'warning'` since that's the actual danger/warning category.

### 1c. IncidentList type errors (lines 347, 362)
The `investigations` field from the Supabase query returns an **array** of objects, but TypeScript is inferring it as a single object. The existing `as any` cast on `incident_type` needs to extend to the whole object, or we cast `investigations` properly. The simplest fix: cast the full mapped object `as any` for both the table view and card view props.

---

## Part 2: UnifiedTimelineTracker UI Improvements (selected element)

The current tracker has overlapping absolute panels, cramped text on mobile, and unclear step boundaries. Changes:

### Mobile (vertical layout)
- Remove the confusing absolute background panel overlay -- use a simpler inline layout
- Increase padding and spacing between steps  
- Add a role badge pill below each step label showing the typical role
- Make the connector line cleaner with proper alignment

### Desktop (horizontal layout)
- Give each step more breathing room with `gap-2` between flex items
- Center labels better under the node circles
- Add the step number inside the circle for upcoming steps
- Make the current step more visually distinct with a subtle background highlight

### Responsive improvements
- Use `text-start` instead of `text-left` (RTL compliance)
- Remove `max-h-[400px]` scroll container on mobile -- let the tracker take its natural height (only 5 steps, no need for scrolling)
- Simplify the sticky behavior -- remove it, as 5 steps fit without scrolling

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/hsse-cron/index.ts` | Cast `error`/`e` as `Error` in 3 catch blocks |
| `src/components/investigation/CurrentOwnerCard.tsx` | Change `'critical'` to `'warning'` |
| `src/pages/incidents/IncidentList.tsx` | Cast incident objects to fix `investigations` type |
| `src/components/investigation/UnifiedTimelineTracker.tsx` | Rewrite layout for clarity and responsiveness |

