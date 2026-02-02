
# Fix: Gate Pass QR Scan "Page Failed to Load" Error

## Problem Identified
When a Security Guard scans a gate pass QR code that is invalid or expired, the page crashes with "Cannot read properties of undefined (reading 'length')".

**Root Cause:** The `validate-material-qr` edge function returns different response structures:
- Error cases (lines 66, 111, 200) return `{ is_valid: false, errors: [...] }` WITHOUT the `warnings` array
- Success cases return both `errors` and `warnings` arrays

The frontend component (`MaterialPassVerificationPanel.tsx`) assumes both arrays always exist:
```tsx
{result.errors.length > 0 && ...}   // Line 315 - works
{result.warnings.length > 0 && ...} // Line 327 - CRASHES when warnings is undefined
```

---

## Solution
Two-part fix to ensure robustness:

### Part 1: Frontend Defensive Coding
Update `MaterialPassVerificationPanel.tsx` to use optional chaining when accessing arrays:

**Line 315:**
```tsx
// Before
{result.errors.length > 0 && ...}
// After  
{result.errors?.length > 0 && ...}
```

**Line 327:**
```tsx
// Before
{result.warnings.length > 0 && ...}
// After
{result.warnings?.length > 0 && ...}
```

### Part 2: Edge Function Consistency
Update `validate-material-qr` edge function to ALWAYS return both arrays:

**Line 66:**
```ts
{ is_valid: false, errors: ['Missing QR token or tenant ID'], warnings: [] }
```

**Line 111:**
```ts
{ is_valid: false, errors: ['Invalid or expired gate pass QR code'], warnings: [] }
```

**Line 200:**
```ts
{ is_valid: false, errors: ['Internal server error'], warnings: [] }
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/security/MaterialPassVerificationPanel.tsx` | Add optional chaining (`?.`) for `errors` and `warnings` arrays |
| `supabase/functions/validate-material-qr/index.ts` | Add `warnings: []` to all error responses |

---

## Technical Details

### Component Changes (MaterialPassVerificationPanel.tsx)
- Line 315: `result.errors?.length > 0`
- Line 327: `result.warnings?.length > 0`

### Edge Function Changes (validate-material-qr/index.ts)
- Line 66: Add `warnings: []` to missing params response
- Line 111: Add `warnings: []` to pass not found response  
- Line 200: Add `warnings: []` to internal error response

---

## Testing Steps
1. Log in as Security Guard (Sultan or similar)
2. Navigate to `/security/gate-dashboard`
3. Scan an invalid/expired gate pass QR code
4. Verify error message displays properly (no crash)
5. Scan a valid approved gate pass QR code
6. Verify entry/exit is recorded successfully
