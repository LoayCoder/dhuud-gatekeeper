

# Fix: "0 of 0" — Sessions Created from Empty Templates

## Root Cause

The template **"Fire protection equipment inspection"** (`007fae6c`) has **zero checklist items** in `inspection_template_items`. The system allows creating and starting sessions from templates with no questions, resulting in an empty "0 of 0 answered" display. This is a **validation gap**, not a data sync bug.

**Database evidence:**
- `inspection_template_items` table has 0 rows total
- The session correctly links to the template, but the template has no content

---

## Fix Plan

### 1. Add validation in session creation dialogs

**Files:** `CreateAreaSessionDialog.tsx`, `CreateSessionDialog.tsx`, `CreateAuditSessionDialog.tsx`

Before allowing form submission, query `inspection_template_items` count for the selected template. If count is 0:
- Disable the "Create" button
- Show a warning: "This template has no checklist items. Please add items to the template first."

### 2. Add empty-state guidance in AreaSessionWorkspace

**File:** `src/pages/inspections/AreaSessionWorkspace.tsx`

When `templateItems.length === 0` and session is `in_progress`, show a more helpful message with a link to the template editor instead of just "No items".

### 3. Add item count indicator in template selector

**Files:** `CreateAreaSessionDialog.tsx` (and other create dialogs)

Show the item count next to each template in the dropdown (e.g., "Fire protection — 5 items") so users can see which templates are ready to use.

### 4. Add validation in TemplateItemBuilder

**File:** `TemplateItemBuilder.tsx`

Show a warning banner when the template has 0 items, prompting the user to add at least one checklist question before the template can be used in sessions.

---

## Technical Details

- Template item count query: `supabase.from('inspection_template_items').select('id', { count: 'exact', head: true }).eq('template_id', templateId).is('deleted_at', null)`
- No database migration needed — this is purely frontend validation
- The `useTemplateItems` hook already works correctly; the data is simply empty

