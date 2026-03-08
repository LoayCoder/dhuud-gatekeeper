

## Plan: Fix i18n for `/contractors/companies` page

### Problem
The `/contractors/companies` page has **TYPE B** issues (missing translation keys). Console logs show 7 missing keys under `contractors.stats.*` and `contractors.charts.*` namespaces that don't exist in either EN or AR translation files.

### Missing Keys (from console logs)
| Key | Fallback | Source Component |
|-----|----------|-----------------|
| `contractors.stats.pendingWorkers` | "Pending Workers" | ContractorCompanyKPICards.tsx |
| `contractors.stats.totalWorkers` | "Total Workers" | ContractorCompanyKPICards.tsx |
| `contractors.stats.expiringContracts` | "Expiring Soon" | ContractorCompanyKPICards.tsx |
| `contractors.stats.within30Days` | "Within 30 days" | ContractorCompanyKPICards.tsx |
| `contractors.stats.needsAttention` | "Needs Attention" | ContractorCompanyKPICards.tsx |
| `contractors.stats.totalCompanies` | "Total Companies" | ContractorCompanyKPICards.tsx |
| `contractors.stats.activeCompanies` | "Active" | ContractorCompanyKPICards.tsx |
| `contractors.stats.companies` | "Companies" | CompaniesByCityChart.tsx |
| `contractors.stats.expiring` | "Expiring" | Companies.tsx tab |
| `contractors.charts.workersByCompany` | "Workers By Company" | WorkersByCompanyChart.tsx |
| `contractors.charts.companiesByCity` | "Companies by City" | CompaniesByCityChart.tsx |
| `contractors.charts.statusByBranch` | "Status By Branch" | StatusByBranchChart.tsx |
| `contractors.status.expired` | "Expired" | CompanyListTable.tsx, StatusByBranchChart.tsx |
| `contractors.status.pending_approval` | "Pending Approval" | CompanyListTable.tsx |

Also need to verify: `contractors.companies.*` sub-keys exist in AR (they exist in EN at lines 8283-8337 but need AR equivalents).

### Changes

#### 1. Add `contractors.stats` section to both EN and AR translation files
- EN: Add under the `contractors` object with all stat keys
- AR: Add corresponding Arabic translations

#### 2. Add `contractors.charts` section to both EN and AR translation files
- EN: Add chart title keys
- AR: Add Arabic translations

#### 3. Add missing `contractors.status` keys
- Add `expired` and `pending_approval` to both `contractors.status` sections

#### 4. Add `contractors.companies` section to AR translation file
- The EN file already has this section (lines 8283-8337)
- AR file needs the full Arabic translation of all `contractors.companies.*` keys (~35 keys)

### Files to Edit
1. `src/locales/en/translation.json` — Add `contractors.stats`, `contractors.charts`, missing `contractors.status` keys
2. `src/locales/ar/translation.json` — Add `contractors.stats`, `contractors.charts`, `contractors.companies`, missing `contractors.status` keys

### No component changes needed
All components already use `t()` calls correctly. This is purely a TYPE B fix (adding missing keys to locale files).

