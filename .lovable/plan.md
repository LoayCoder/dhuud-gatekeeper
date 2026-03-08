

## Plan: Fix i18n for `/contractors/analytics` page

### Problem
The `Analytics.tsx` page uses ~25 `t()` keys under the `contractors.analytics.*` namespace, but this section does not exist in either EN or AR locale files. The `contractors.analytics` path currently resolves to the flat nav string `"Analytics"`, not an object.

### Missing Keys (all from `Analytics.tsx`)

| Key | Default Value |
|-----|---------------|
| `title` | "Contractor Analytics" |
| `subtitle` | "Performance metrics and insights" |
| `activeCompanies` | "Active Companies" |
| `ofTotal` | "of {{count}} total" |
| `approvedWorkers` | "Approved Workers" |
| `pending` | "pending" |
| `todayPasses` | "Today's Passes" |
| `totalPasses` | "{{count}} total" |
| `complianceRate` | "Compliance Rate" |
| `workerApprovalRate` | "Worker approval rate" |
| `tabs.overview` | "Overview" |
| `tabs.workers` | "Workers" |
| `tabs.gatePasses` | "Gate Passes" |
| `workersByCompany` | "Workers by Company" |
| `noData` | "No data available" |
| `workerStatus` | "Worker Status Distribution" |
| `monthlyTrend` | "Monthly Activity Trend" |
| `noTrendData` | "No gate pass activity in the last 6 months" |
| `passTypes` | "Gate Pass Types" |
| `summary` | "Quick Summary" |
| `totalCompanies` | "Total Companies" |
| `totalWorkers` | "Total Workers" |
| `totalGatePasses` | "Total Gate Passes" |
| `avgWorkersPerCompany` | "Avg Workers/Company" |

### Conflict Resolution
The EN nav key `contractors.nav.analytics` is `"Analytics"` (flat string). The new `contractors.analytics` must be an **object**. Currently line 8059 has `"analytics": "Analytics"` but that's inside the `nav` object, so there's no conflict — `contractors.analytics` as a sibling object is fine.

### Changes

#### 1. `src/locales/en/translation.json`
- Add `contractors.analytics` object with all 25 keys (including nested `tabs` object)

#### 2. `src/locales/ar/translation.json`
- Add `contractors.analytics` object with Arabic translations for all 25 keys

#### 3. `src/pages/contractors/Analytics.tsx`
- Fix the `ofTotal` and `totalPasses` keys to use proper i18n interpolation (`{{count}}`) instead of template literals

### No other component changes needed

