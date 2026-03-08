

## Plan: Fix remaining English strings on /security page

### Root Cause
The quick action buttons use translation keys directly under `security.*` (e.g., `security.emergencyAlerts`), but in the Arabic file these translations only exist under `security.menu.*` (e.g., `security.menu.emergencyAlerts`).

### Missing keys (direct children of `security`)
These 4 keys need to be added to the `security` block in the Arabic file (after line 9030):

| Key | Arabic |
|-----|--------|
| `emergencyAlerts` | تنبيهات الطوارئ |
| `shiftHandover` | تسليم المناوبة |
| `guardPerformance` | أداء الحراس |
| `reportSchedules` | جداول التقارير |

Also verify the same keys exist in the English file under `security.*`.

### Changes

#### 1. `src/locales/ar/translation.json`
Add 4 keys as direct children of the `security` object (lines ~9031, before `menu`):
- `"emergencyAlerts": "تنبيهات الطوارئ"`
- `"shiftHandover": "تسليم المناوبة"`
- `"guardPerformance": "أداء الحراس"`
- `"reportSchedules": "جداول التقارير"`

#### 2. `src/locales/en/translation.json`
Add same 4 keys under `security` if missing:
- `"emergencyAlerts": "Emergency Alerts"`
- `"shiftHandover": "Shift Handover"`
- `"guardPerformance": "Guard Performance"`
- `"reportSchedules": "Report Schedules"`

No component changes needed — the `t()` calls already reference the correct paths.

