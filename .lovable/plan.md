

## Plan: Add i18n for `/admin/sla-analytics` page

### Problem
The SLA Analytics page (`SLAAnalytics.tsx`) and its 3 sub-components (`SLAComplianceChart`, `DepartmentPerformanceTable`, `EscalationHeatmap`) use ~20 `sla.*` translation keys that are missing from both EN and AR locale files.

### Missing Keys

**Page-level (`SLAAnalytics.tsx`):**
| Key | English |
|-----|---------|
| `sla.analyticsDescription` | "Historical trends, performance metrics, and compliance reports" |
| `sla.complianceRate` | "Compliance Rate" |
| `sla.onTimeCompletion` | "on-time completion" |
| `sla.avgResolution` | "Avg Resolution" |
| `sla.fromCreationToClose` | "from creation to close" |
| `sla.escalationRate` | "Escalation Rate" |
| `sla.escalatedActions` | "escalated actions" |
| `sla.active` | "active" |
| `sla.onTime` | "On Time" |
| `sla.breached` | "Breached" |

**Chart component (`SLAComplianceChart.tsx`):**
| Key | English |
|-----|---------|
| `sla.complianceTrend` | "SLA Compliance Trend" |
| `sla.completedOnTime` | "Completed On Time" |

**Table component (`DepartmentPerformanceTable.tsx`):**
| Key | English |
|-----|---------|
| `sla.departmentPerformance` | "Department Performance" |
| `sla.totalActionsCount` | "Total Actions" |

**Heatmap component (`EscalationHeatmap.tsx`):**
| Key | English |
|-----|---------|
| `sla.escalationDistribution` | "Escalation Distribution" |
| `sla.noEscalation` | "No Escalation" |
| `sla.level1` | "Level 1" |
| `sla.level2` | "Level 2" |
| `sla.priorityBreakdown` | "Priority Breakdown" |
| `sla.total` | "Total" |

### Key Conflict: `sla.totalActions`
The existing `sla.totalActions` = `"{{count}} actions requiring attention"` (interpolated). But `DepartmentPerformanceTable` and `SLAAnalytics` KPI card use `t('sla.totalActions', 'Total Actions')` expecting a plain label. Fix: use a new key `sla.totalActionsCount` for the plain label, and update both components to reference it.

### Changes

#### 1. `src/locales/en/translation.json`
Add all 20 missing keys to the `sla` block.

#### 2. `src/locales/ar/translation.json`
Add matching Arabic translations.

#### 3. `src/pages/admin/SLAAnalytics.tsx`
Change `t('sla.totalActions', 'Total Actions')` → `t('sla.totalActionsCount', 'Total Actions')` (line 156).

#### 4. `src/components/sla/DepartmentPerformanceTable.tsx`
Change `t('sla.totalActions', 'Total Actions')` → `t('sla.totalActionsCount', 'Total Actions')`.

