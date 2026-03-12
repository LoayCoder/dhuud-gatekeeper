
# Fix "Take Action" Button for Department Representative

## Problem
When Khalid Al Shuhail (Department Representative) views an incident and clicks "Take Action" in the CurrentOwnerCard, nothing happens. Two root causes:

1. **The "Take Action" button has no `onClick` handler** -- it's purely cosmetic (line 105 of `CurrentOwnerCard.tsx`).
2. **The `pending_dept_rep_review` status is missing from `renderWorkflowCards()`** in `InvestigationWorkspace.tsx` -- so the actual DeptRepApprovalCard never renders for that status.

## What Changes

### 1. Add `pending_dept_rep_review` to `renderWorkflowCards()` (InvestigationWorkspace.tsx)

The switch statement at line 380 only handles `pending_dept_rep_approval`. The newer `pending_dept_rep_review` status (used for non-contractor observations) is not mapped, so no workflow action card appears.

**Fix:** Add `pending_dept_rep_review` as a case that falls through to the same `DeptRepApprovalCard`:

```typescript
case 'pending_dept_rep_review':
case 'pending_dept_rep_approval':
  return (
    <DeptRepApprovalCard
      incident={incidentData}
      onComplete={handleRefresh}
    />
  );
```

### 2. Wire "Take Action" Button to Scroll to Workflow Card (CurrentOwnerCard.tsx)

The "Take Action" button should scroll the user down to the workflow action card (e.g., `DeptRepApprovalCard`) so they can perform the actual approval/rejection.

**Fix:** Add an `onClick` handler that scrolls to the workflow card section:

```typescript
<Button
  size="lg"
  className="shadow-lg px-8"
  onClick={() => {
    // Scroll to the workflow action card
    const workflowCard = document.querySelector('[data-workflow-card]');
    if (workflowCard) {
      workflowCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }}
>
  Take Action
  <ArrowRight className="h-4 w-4 ml-2" />
</Button>
```

And add a `data-workflow-card` attribute to the wrapper div in `renderWorkflowCards()` output so the scroll target is discoverable.

### 3. Localize the Button Text

Replace the hardcoded "Take Action" text with a translation key: `t('workflow.currentOwner.takeAction', 'Take Action')`. Also localize "Send Reminder" and "Escalate" buttons in the same card. Add Arabic translations.

## Files Modified

1. **`src/pages/incidents/InvestigationWorkspace.tsx`** -- Add `pending_dept_rep_review` case to `renderWorkflowCards()`, wrap workflow card output with `data-workflow-card` attribute
2. **`src/components/investigation/CurrentOwnerCard.tsx`** -- Add `onClick` scroll handler to "Take Action" button, localize button texts
3. **`src/locales/en/translation.json`** -- Add `workflow.currentOwner.takeAction`, `workflow.currentOwner.sendReminder`, `workflow.currentOwner.escalate`
4. **`src/locales/ar/translation.json`** -- Add Arabic translations for the same keys
