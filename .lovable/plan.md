

# Fix: Missing `admin.badges` Keys + Missing `admin.challenges` Namespace

## Problem

The `/admin/badges` page has two translation gaps:

1. **`admin.badges`** — exists but missing 11 keys used by `BadgeDefinitionsTab` and `BadgeFormDialog`: `credentialDefinitions`, `manageCredentials`, `addCredential`, `name`, `status`, `noCredentials`, `addFirst`, `descEn`, `descAr`, `tier`, `create`

2. **`admin.challenges`** — entirely missing namespace (~25 keys) used by `ChallengesTab` and `ChallengeFormDialog`: `target`, `title`, `status`, `type`, `period`, `points`, `objectives`, `manageObjectives`, `addObjective`, `activeObjectives`, `upcomingObjectives`, `pastObjectives`, `noObjectives`, `addFirst`, `deleteTitle`, `deleteDescription`, `editChallenge`, `createChallenge`, `titleEn`, `titleAr`, `metric`, `startDate`, `endDate`, `badge`, `create`

## Fix

### File 1: `src/locales/en/translation.json`
- Add 11 missing keys to the existing `admin.badges` object
- Add new `admin.challenges` object with ~25 keys

### File 2: `src/locales/ar/translation.json`
- Add same 11 missing keys to `admin.badges`
- Add new `admin.challenges` object with Arabic translations

No component changes needed.

