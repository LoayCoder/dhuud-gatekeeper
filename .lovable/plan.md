

# Redesign: Simplified UnifiedTimelineTracker

## Current Issues
- Visually heavy: large circles (w-10 h-10), thick role badges, excessive padding
- Duplicated mobile/desktop layouts with lots of repeated code
- Role badges clutter the view -- they're secondary info shown with equal prominence
- Card wrapper adds unnecessary border/shadow weight

## New Design: Clean Stepper Bar

A minimal horizontal progress bar with small dots, clean labels, and role shown only on the active step. Mobile gets a compact vertical list.

```text
Desktop:
  ●───────●───────◉───────○───────○
  Submitted  Review   Approval  Actions  Closed
                     Dept Rep
                     (current)

Mobile:
  ● Submitted
  ● Initial Review
  ◉ Approval · Dept Rep / Client  ← current
  ○ Actions
  ○ Closed
```

## Key Changes (1 file: `UnifiedTimelineTracker.tsx`)

1. **Smaller nodes**: w-7 h-7 circles with smaller icons (h-3.5 w-3.5)
2. **Role only on current step**: Hide `typicalRole` badges on completed/upcoming steps -- show only on the active step as subtle text below the label
3. **Remove Card wrapper**: Use a simple `div` with light border-bottom or no border, reducing visual weight
4. **Merge mobile/desktop**: Use a single responsive layout -- horizontal on md+, vertical on mobile -- without duplicating all the markup
5. **Tighter spacing**: Reduce padding from p-4/p-6 to p-3, smaller gaps
6. **Current step highlight**: Subtle primary background pill around the current step label instead of a ring on the circle
7. **Completed steps**: Small filled primary dots with checkmark, no large circles
8. **Upcoming steps**: Small muted dots with step number in tiny text

## Technical Details

- Keep all existing props, types, `getStepIndex`, `getSteps` logic unchanged
- Keep all `t()` translation wrappers
- Keep role-color imports for the current step's role badge
- Remove `Tooltip` usage to simplify (role info only shown on active step inline)
- Keep RTL compatibility with logical CSS properties

