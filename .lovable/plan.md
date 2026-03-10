

# Fix: Arabic `subscription` Namespace is a Flat String

## Problem

Line 5534 in `src/locales/ar/translation.json` has `"subscription": "الاشتراك"` — a flat string instead of the nested object with ~125 keys that the English file has (lines 6343–6468). This means the entire `/settings/subscription` page falls back to English for Arabic users.

## Fix

### File: `src/locales/ar/translation.json`

Replace `"subscription": "الاشتراك"` with a full nested object matching the English structure (~125 keys), including:

- **Root keys (~50):** title, description, currentPlan, noPlan, trialStatus, activeStatus, inactiveStatus, canceledStatus, availablePlans, comparePlans, planComparison, features, maxUsers, priceBreakdown, basePlan, totalMonthly, month, annualEstimate, selectModules, numberOfUsers, etc.
- **Billing period (~18):** billingPeriod, selectDuration, selectMonths, yearlyOption, monthlyOption, monthsOption, selectedPeriod, oneYear, oneMonth, nMonths, discount, monthlyRate, originalPrice, discountApplied, totalForPeriod, youSave, comparedToMonthly, selectionSummary
- **Request flow (~25):** myRequests, requestPlan, noRequests, noRequestsDesc, pendingRequestWarning, requestedPlan, requestedUsers, requestedModules, estimatedPrice, confirmRequest, submitRequest, requestSubmitted, requestSent, confirmationEmailMessage, cancelRequest, requestCanceled, confirmCancelTitle, confirmCancelMessage, etc.
- **status sub-object (6):** pending, under_review, approved, declined, modified, canceled
- **requestType sub-object (5):** new, upgrade, downgrade, modify, cancel

All values translated to Arabic. No component changes needed.

