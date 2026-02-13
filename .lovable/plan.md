

## Fix: Branch Event Density Always Showing "Critical"

### Problem

The density score is calculated by dividing each branch's event count by the maximum branch event count (`total_events / maxBranchEvents * 100`). This means:
- With **1 branch**: it always scores 100% (Critical)
- With **multiple branches**: the top branch is always Critical regardless of actual risk

This is misleading -- a branch with 5 low-severity events should not appear the same as one with 100 catastrophic events.

### Solution: Severity-Weighted Density

Replace the pure count-based normalization with a **severity-weighted density score** that reflects actual risk, not just volume.

**Weighting formula:**
```
weighted_score = (level_5 * 5) + (level_4 * 4) + (level_3 * 3) + (level_2 * 2) + (level_1 * 1)
max_possible = total_events * 5  (if all were catastrophic)
density_score = (weighted_score / max_possible) * 100
```

This means:
- A branch with all Level 1 events scores ~20% (Low/green)
- A branch with all Level 5 events scores 100% (Critical/red)
- Mixed severity falls in between proportionally

### File Change

**`src/hooks/use-location-heatmap.ts`** (lines ~148-151)

Replace the current normalization block:
```typescript
// Current (broken)
branches.forEach(b => {
  b.density_score = Math.round((b.total_events / maxBranchEvents) * 100);
});
```

With severity-weighted calculation:
```typescript
// Fixed: severity-weighted density
branches.forEach(b => {
  const weightedScore =
    (b.level_5_count * 5) +
    (b.level_4_count * 4) +
    (b.level_3_count * 3) +
    (b.level_2_count * 2) +
    (b.level_1_count * 1);
  const maxPossible = b.total_events * 5;
  b.density_score = maxPossible > 0
    ? Math.round((weightedScore / maxPossible) * 100)
    : 0;
});
```

No changes needed to `BranchHeatmapGrid.tsx` -- the existing color thresholds (0-24 Low, 25-49 Medium, 50-74 High, 75-100 Critical) will now reflect actual severity mix rather than relative volume.

### Expected Result

With the current data (114 events in RGC), the density color will depend on the actual severity distribution of those events rather than always showing red/Critical.

