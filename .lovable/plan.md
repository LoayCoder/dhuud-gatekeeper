

# Fix: WorkflowCanvas crash — missing node type configs

## Problem
`NodeType` defines 9 types: `start`, `end`, `action`, `decision`, `approval`, `subprocess`, `notification`, `gate`, `ai`. But `NODE_CONFIG` in `render-workflow-svg.ts` only has 6 entries. When a workflow step uses `notification`, `gate`, or `ai`, `NODE_CONFIG[step.type]` returns `undefined`, and accessing `.rx` crashes the page.

## Fix

### File: `src/lib/render-workflow-svg.ts`

Add the 3 missing node types to `NODE_CONFIG` (after line 26):

```typescript
const NODE_CONFIG = {
  start: { fill: 'hsl(142, 76%, 36%)', stroke: 'hsl(142, 76%, 28%)', textColor: '#ffffff', rx: 20 },
  end: { fill: 'hsl(0, 84%, 60%)', stroke: 'hsl(0, 84%, 50%)', textColor: '#ffffff', rx: 20 },
  action: { fill: 'hsl(217, 91%, 60%)', stroke: 'hsl(217, 91%, 50%)', textColor: '#ffffff', rx: 8 },
  decision: { fill: 'hsl(45, 93%, 47%)', stroke: 'hsl(45, 93%, 40%)', textColor: '#000000', rx: 0 },
  approval: { fill: 'hsl(270, 76%, 60%)', stroke: 'hsl(270, 76%, 50%)', textColor: '#ffffff', rx: 0 },
  subprocess: { fill: 'hsl(199, 89%, 48%)', stroke: 'hsl(199, 89%, 38%)', textColor: '#ffffff', rx: 8 },
  notification: { fill: 'hsl(38, 92%, 50%)', stroke: 'hsl(38, 92%, 40%)', textColor: '#ffffff', rx: 8 },
  gate: { fill: 'hsl(210, 40%, 50%)', stroke: 'hsl(210, 40%, 40%)', textColor: '#ffffff', rx: 4 },
  ai: { fill: 'hsl(280, 67%, 55%)', stroke: 'hsl(280, 67%, 45%)', textColor: '#ffffff', rx: 12 },
};
```

Also add a safety fallback in `renderNode` (line 126) so any future unknown types don't crash:

```typescript
const config = NODE_CONFIG[step.type] ?? NODE_CONFIG.action;
```

### Files Modified
1. `src/lib/render-workflow-svg.ts` — Add 3 missing node configs + fallback guard

