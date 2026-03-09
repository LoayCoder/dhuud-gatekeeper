

## Fix: CCTV Page "Failed to Load" Crash

### Root Cause
Line 257 in `src/pages/security/CCTVManagement.tsx`:
```tsx
<SelectItem value="">{t('common.all', 'All')}</SelectItem>
```
Radix UI `Select.Item` throws a runtime error when `value` is an empty string `""`. This crashes the component tree and the `PageLoadErrorBoundary` catches it as "Page Failed to Load".

### Fix
1. **Change the "All" SelectItem value** from `""` to `"all"` on line 257.
2. **Update the filter logic** on line 71 to treat `"all"` the same as no filter:
   ```tsx
   status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
   ```
3. **Update the initial state** on line 66 from `''` to `'all'`:
   ```tsx
   const [statusFilter, setStatusFilter] = useState<string>('all');
   ```

### Files Changed
- `src/pages/security/CCTVManagement.tsx` — 3 small edits (lines 66, 71, 257)

