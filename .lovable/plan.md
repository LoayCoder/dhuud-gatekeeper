

# Remove "Seed Test Data" Button from Projects Page

## Change

Remove the seed test data button and all related code from `src/pages/contractors/Projects.tsx`.

| Step | Change |
|------|--------|
| 1 | Remove `isSeeding` state, `handleSeedData` function, and the seed button JSX |
| 2 | Remove unused imports: `Database`, `Loader2`, `supabase`, `toast`, `useQueryClient` (if not used elsewhere) |

The button on lines 80-83 and the handler on lines 42-57 will be removed. The "Add Project" button remains.

