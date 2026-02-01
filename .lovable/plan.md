
# Gate Pass Multi-Item and Entry/Exit Validation Plan

## Overview

This plan updates the `/my-gate-passes/create` flow to:
1. Support multiple items (like the `GatePassFormDialog` component)
2. Show a warning when "Entry & Exit" pass type is selected
3. Enforce strict vehicle/driver matching validation during exit at the backend level

---

## Current State Analysis

| Component | Issue |
|:----------|:------|
| `/my-gate-passes/Create.tsx` | Only supports **single item** - no table, no add/remove functionality |
| `GatePassFormDialog.tsx` | Already supports **multiple items** with repeatable table |
| `use-gate-pass-guard-actions.ts` | Exit action does NOT validate vehicle/driver matching |
| `validate-material-qr/index.ts` | No vehicle/driver matching validation during exit |
| Database | No constraint or trigger to enforce matching |

---

## Implementation Plan

### Phase 1: Consolidate Create Page to Use Multi-Item Form

**Option A (Recommended)**: Replace the content of `/my-gate-passes/Create.tsx` with a page-based version of the multi-item form from `GatePassFormDialog.tsx`.

**Changes to `src/pages/my-gate-passes/Create.tsx`:**

```text
Current:
- Single item_name, item_description, quantity, unit fields
- No table
- No add/remove functionality

New:
- Items table with SR#, Item Name, Description, Qty, Unit columns
- Add Item button (+إضافة صنف)
- Remove item button per row
- Minimum 1 item required
```

**Key UI Elements (matching reference image):**
- Table headers: #SR | اسم الصنف * | الوصف | الكمية | الوحدة | (delete button)
- Add button: "+ إضافة صنف" / "+ Add Item"
- Unit dropdown with options: Pieces, Bags, Boxes, kg, Tons, Liters, Meters, etc.

---

### Phase 2: Add Entry & Exit Warning Alert

When user selects `in_out` (Entry & Exit) pass type, show a prominent warning:

```typescript
{passType === "in_out" && (
  <Alert variant="warning" className="mt-3">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>{t("gatePasses.entryExitWarning.title", "Important Notice")}</AlertTitle>
    <AlertDescription>
      {t("gatePasses.entryExitWarning.message", 
        "For Entry & Exit passes, the same Vehicle Plate and Driver Name must be used during exit. " +
        "Mismatched details will result in the exit being rejected by security."
      )}
    </AlertDescription>
  </Alert>
)}
```

**Translation keys to add:**

**English:**
```json
"gatePasses": {
  "entryExitWarning": {
    "title": "Important Notice",
    "message": "For Entry & Exit passes, the same Vehicle Plate and Driver Name must be used during exit. Mismatched details will result in the exit being rejected by security."
  }
}
```

**Arabic:**
```json
"gatePasses": {
  "entryExitWarning": {
    "title": "ملاحظة هامة",
    "message": "لتصاريح الدخول والخروج، يجب استخدام نفس لوحة المركبة واسم السائق عند الخروج. سيتم رفض الخروج في حالة عدم تطابق البيانات."
  }
}
```

---

### Phase 3: Backend Validation for Exit (Database RPC)

Create a new database function `validate_gate_pass_exit` to enforce matching:

```sql
CREATE OR REPLACE FUNCTION validate_gate_pass_exit(
  p_gate_pass_id UUID,
  p_exit_vehicle_plate TEXT,
  p_exit_driver_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_result JSONB;
BEGIN
  -- Fetch the gate pass
  SELECT pass_type, vehicle_plate, driver_name, entry_time, exit_time
  INTO v_pass
  FROM material_gate_passes
  WHERE id = p_gate_pass_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found');
  END IF;
  
  -- Check if already has exit time
  IF v_pass.exit_time IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Exit already recorded');
  END IF;
  
  -- For in_out passes, validate matching vehicle and driver
  IF v_pass.pass_type = 'in_out' OR v_pass.pass_type ILIKE '%in%out%' OR v_pass.pass_type ILIKE '%entry%exit%' THEN
    -- Must have entry recorded first
    IF v_pass.entry_time IS NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Entry not yet recorded - cannot process exit');
    END IF;
    
    -- Validate vehicle plate (case-insensitive, trim whitespace)
    IF v_pass.vehicle_plate IS NOT NULL AND TRIM(UPPER(v_pass.vehicle_plate)) != TRIM(UPPER(COALESCE(p_exit_vehicle_plate, ''))) THEN
      RETURN jsonb_build_object(
        'allowed', false, 
        'reason', 'Vehicle plate mismatch - expected: ' || v_pass.vehicle_plate,
        'expected_vehicle', v_pass.vehicle_plate,
        'provided_vehicle', p_exit_vehicle_plate
      );
    END IF;
    
    -- Validate driver name (case-insensitive, trim whitespace)
    IF v_pass.driver_name IS NOT NULL AND TRIM(UPPER(v_pass.driver_name)) != TRIM(UPPER(COALESCE(p_exit_driver_name, ''))) THEN
      RETURN jsonb_build_object(
        'allowed', false, 
        'reason', 'Driver name mismatch - expected: ' || v_pass.driver_name,
        'expected_driver', v_pass.driver_name,
        'provided_driver', p_exit_driver_name
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;
```

---

### Phase 4: Update Guard Exit Action Hook

Modify `src/hooks/contractor-management/use-gate-pass-guard-actions.ts` to:

1. For exit actions, first call `validate_gate_pass_exit` RPC
2. If validation fails, reject the exit with clear error message
3. Security guards cannot override - the validation is mandatory

```typescript
// Inside useGuardGateAction mutationFn for 'exit' action:

if (action === 'exit') {
  // For in_out passes, validate vehicle/driver matching
  const { data: validation, error: validationError } = await supabase.rpc('validate_gate_pass_exit', {
    p_gate_pass_id: passId,
    p_exit_vehicle_plate: exitVehiclePlate || passData.vehicle_plate,
    p_exit_driver_name: exitDriverName || passData.driver_name
  });

  if (validationError || !validation?.allowed) {
    const reason = validation?.reason || validationError?.message || 'Exit validation failed';
    
    // Log the denied action
    await logGateAudit({
      action: 'gate_pass_denied',
      passId,
      passReference,
      result: 'denied',
      reason: reason,
      validationMethod,
      metadata: {
        ...metadata,
        expected_vehicle: validation?.expected_vehicle,
        provided_vehicle: validation?.provided_vehicle,
        expected_driver: validation?.expected_driver,
        provided_driver: validation?.provided_driver,
      }
    }, tenantId, user.id, profile?.full_name || null);

    throw new Error(reason);
  }
  
  // Proceed with exit recording...
}
```

---

### Phase 5: Update Edge Function for QR Exit Validation

Modify `supabase/functions/validate-material-qr/index.ts` to include exit validation:

```typescript
// Add to validation result interface
interface ValidationResult {
  // ... existing fields
  exit_validation?: {
    requires_matching: boolean;
    original_vehicle_plate: string | null;
    original_driver_name: string | null;
  };
}

// In the validation logic, add:
if (pass.pass_type === 'in_out' && pass.entry_time && !pass.exit_time) {
  result.exit_validation = {
    requires_matching: true,
    original_vehicle_plate: pass.vehicle_plate,
    original_driver_name: pass.driver_name,
  };
  result.warnings.push(
    'Exit requires matching Vehicle Plate and Driver Name from entry record'
  );
}
```

---

### Phase 6: Add Exit Confirmation UI for Guards

When a guard scans for exit on an `in_out` pass, show a confirmation dialog with:

1. **Original entry details** (vehicle plate, driver name from pass)
2. **Current details** (what the guard sees on the vehicle/driver now)
3. **Match/Mismatch indicator**
4. **Clear rejection message if mismatched**

---

## Files to Create/Modify

| File | Action | Description |
|:-----|:-------|:------------|
| `src/pages/my-gate-passes/Create.tsx` | **Major Rewrite** | Replace single-item form with multi-item table |
| `src/locales/en/translation.json` | **Modify** | Add `entryExitWarning` translations |
| `src/locales/ar/translation.json` | **Modify** | Add `entryExitWarning` Arabic translations |
| Migration SQL | **Create** | Add `validate_gate_pass_exit` RPC function |
| `src/hooks/contractor-management/use-gate-pass-guard-actions.ts` | **Modify** | Add exit validation before recording |
| `supabase/functions/validate-material-qr/index.ts` | **Modify** | Add exit validation info to response |

---

## Security Enforcement Summary

| Layer | Enforcement |
|:------|:------------|
| **UI Warning** | Alert shown when `in_out` selected - informational only |
| **Frontend Validation** | Hook calls RPC before allowing exit action |
| **Backend RPC** | `validate_gate_pass_exit` performs strict matching |
| **Edge Function** | Returns validation requirements for QR scans |
| **Guard Override** | NOT POSSIBLE - validation is mandatory at backend |

---

## Validation Rules

```text
For pass_type = 'in_out' (Entry & Exit):

1. Entry must be recorded before exit can be processed
2. During exit:
   a. Vehicle Plate MUST match original (case-insensitive, trimmed)
   b. Driver Name MUST match original (case-insensitive, trimmed)
3. If mismatch detected:
   a. Exit is REJECTED
   b. Reason is logged to security_audit_logs
   c. Clear error message shown to guard
   d. No manual override available
```

---

## UI Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER CREATES GATE PASS                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │  Select Pass Type             │
                    └───────────────┬───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────────┐   ┌───────────────────┐
│ Entry Only (in)   │   │ Exit Only (out)       │   │ Entry & Exit      │
│ No special alert  │   │ No special alert      │   │ (in_out)          │
└───────────────────┘   └───────────────────────┘   └─────────┬─────────┘
                                                              │
                                                              ▼
                                                    ┌───────────────────┐
                                                    │ ⚠️ WARNING ALERT  │
                                                    │ Same vehicle and  │
                                                    │ driver required   │
                                                    │ for exit          │
                                                    └───────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    GUARD PROCESSES EXIT                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │  Is pass_type = 'in_out'?     │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
           ┌───────────────┐               ┌───────────────────┐
           │      NO       │               │       YES         │
           │ Process exit  │               │ Validate matching │
           │ normally      │               └─────────┬─────────┘
           └───────────────┘                         │
                                     ┌───────────────┴───────────────┐
                                     │                               │
                                     ▼                               ▼
                            ┌───────────────────┐           ┌───────────────────┐
                            │ Vehicle & Driver  │           │ MISMATCH          │
                            │ MATCH             │           │ ❌ Exit REJECTED  │
                            │ ✅ Process exit   │           │ Log to audit      │
                            └───────────────────┘           │ Show error        │
                                                            │ NO OVERRIDE       │
                                                            └───────────────────┘
```

---

## Translation Keys Summary

### English
```json
{
  "gatePasses": {
    "entryExitWarning": {
      "title": "Important Notice",
      "message": "For Entry & Exit passes, the same Vehicle Plate and Driver Name must be used during exit. Mismatched details will result in the exit being rejected by security."
    },
    "exitValidation": {
      "mismatchTitle": "Exit Rejected",
      "vehicleMismatch": "Vehicle plate does not match entry record",
      "driverMismatch": "Driver name does not match entry record",
      "expected": "Expected",
      "provided": "Provided",
      "contactSupervisor": "Contact your supervisor if this is a legitimate change."
    }
  }
}
```

### Arabic
```json
{
  "gatePasses": {
    "entryExitWarning": {
      "title": "ملاحظة هامة",
      "message": "لتصاريح الدخول والخروج، يجب استخدام نفس لوحة المركبة واسم السائق عند الخروج. سيتم رفض الخروج في حالة عدم تطابق البيانات."
    },
    "exitValidation": {
      "mismatchTitle": "تم رفض الخروج",
      "vehicleMismatch": "لوحة المركبة لا تتطابق مع سجل الدخول",
      "driverMismatch": "اسم السائق لا يتطابق مع سجل الدخول",
      "expected": "المتوقع",
      "provided": "المقدم",
      "contactSupervisor": "تواصل مع المشرف إذا كان هذا تغيير مشروع."
    }
  }
}
```

---

## Testing Checklist

1. **Multi-Item Form:**
   - [ ] Can add multiple items to the table
   - [ ] Can remove items (except last one)
   - [ ] SR# increments correctly
   - [ ] Unit dropdown works
   - [ ] Form submits with all items

2. **Entry & Exit Warning:**
   - [ ] Warning appears when `in_out` selected
   - [ ] Warning hidden for `in` or `out` types
   - [ ] Translations display correctly (AR/EN)

3. **Exit Validation (Backend):**
   - [ ] Matching vehicle/driver: exit allowed
   - [ ] Mismatched vehicle: exit rejected with clear reason
   - [ ] Mismatched driver: exit rejected with clear reason
   - [ ] Rejection logged to audit logs
   - [ ] Guard cannot override

4. **Edge Function:**
   - [ ] Returns exit_validation info for `in_out` passes
   - [ ] Shows warning in validation response
