

## Plan: Fix i18n for `/contractors/induction-videos` page

### Problem
Three issues:
1. **TYPE A** — `InductionVideos.tsx` (page) uses `contractors.inductionVideos.*` namespace, but the locale files have `contractors.inductionVideos` as a flat string (nav label). The actual keys live under `contractors.induction.*`.
2. **TYPE B** — ~12 keys used by components are missing from EN `contractors.induction` section.
3. **TYPE B** — The entire `contractors.induction` section is missing from AR locale.

### Missing Keys Analysis

**EN `contractors.induction` — keys used but missing:**

| Key | Default | Component |
|-----|---------|-----------|
| `searchVideos` | "Search videos..." | InductionVideoList |
| `validFor` | "Valid For" | InductionVideoList |
| `noVideos` | "No induction videos found" | InductionVideoList |
| `deleteConfirm` | "Are you sure you want to delete this induction video?" | InductionVideoList |
| `duration` | "Duration" | InductionVideoList (table header) |
| `translate` | "Translate" | InductionVideoFormDialog |
| `translateHint` | "Click 'Translate' to auto-translate..." | InductionVideoFormDialog |
| `videoUrlHint` | "Link to the video file or streaming URL" | InductionVideoFormDialog |
| `durationSeconds` | "Duration (seconds)" | InductionVideoFormDialog |
| `validForDays` | "Valid for (days)" | InductionVideoFormDialog |
| `isActiveHint` | "Only active videos can be sent to workers" | InductionVideoFormDialog |
| `expiringAlert` | "{{count}} inductions expiring within 30 days" | InductionComplianceWidget |
| `expiredAlert` | "{{count}} inductions have expired" | InductionComplianceWidget |

**AR — entire `contractors.induction` section missing (~35 keys).**

### Changes

#### 1. `src/pages/contractors/InductionVideos.tsx`
- Fix 3 key paths: `contractors.inductionVideos.title` → `contractors.induction.title`, `.description` → `.description` (rename to `pageDescription` to avoid collision with existing `description` key), `.addVideo` → `.addVideo`
- Actually, `contractors.induction.title` already means "Induction Videos" and `.addVideo` exists. The page description needs a new key `pageDescription` since `description` already has a different value.

#### 2. `src/locales/en/translation.json`
- Add ~13 missing keys to `contractors.induction` section (lines 8189-8222): `searchVideos`, `validFor`, `noVideos`, `deleteConfirm`, `duration` (as table header, distinct from existing `duration` which says "Duration (seconds)"), `translate`, `translateHint`, `videoUrlHint`, `durationSeconds`, `validForDays`, `isActiveHint`, `expiringAlert`, `expiredAlert`, `pageDescription`

#### 3. `src/locales/ar/translation.json`
- Add complete `contractors.induction` section (~35 keys) with Arabic translations matching all EN keys

### Summary
| File | Changes |
|------|---------|
| `InductionVideos.tsx` | Fix 3 key paths (TYPE A) |
| EN `translation.json` | Add ~14 keys to `contractors.induction` |
| AR `translation.json` | Add full `contractors.induction` section (~35 keys) |

