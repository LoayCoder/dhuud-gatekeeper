

# Fix: Invalid Characters in `src/features/security/index.ts`

## Root Cause

Line 119 of `src/features/security/index.ts` contains **zero-width or full-width Unicode characters** between every letter of the export statement. Instead of normal ASCII text, it reads `e x p o r t   *   f r o m   ' . / h o o k s / ...'` with invisible spacing characters. This causes TypeScript error TS1127 ("Invalid character") and **prevents the entire app from building and loading**.

## Fix

Replace line 119 (and the trailing blank line 120) with a clean ASCII export statement:

```typescript
export * from './hooks/use-selected-zone';
```

Single line change — one file affected.

