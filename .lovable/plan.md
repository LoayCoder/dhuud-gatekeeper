
# Auto-Update Version Timestamp on Publish

## Problem

The `public/version.json` file contains hardcoded values that are **never automatically updated**:
- `version`: "2026.01.22.001" (old date)
- `publishedAt`: "2026-01-22T14:30:00Z" (old timestamp)

When you publish the app, this file remains unchanged, so users always see the old date/time.

---

## Solution

Create a build-time script that automatically updates `version.json` with the current Saudi Arabia date and time whenever the app is built for production.

---

## Implementation

### Step 1: Create Version Update Script

Create a new file `scripts/update-version.js` that:
1. Reads the current `version.json`
2. Generates a new version string based on current Saudi Arabia date (format: `YYYY.MM.DD.XXX`)
3. Sets `publishedAt` to the current UTC timestamp
4. Writes the updated file

### Step 2: Update Build Configuration

Modify `package.json` to run the version script before the build:

```json
{
  "scripts": {
    "prebuild": "node scripts/update-version.js",
    "build": "vite build"
  }
}
```

### Step 3: Update version.json Structure

The script will automatically update the file to something like:

```json
{
  "version": "2026.02.02.001",
  "buildDate": "2026-02-02T10:00:00Z",
  "publishedAt": "2026-02-02T10:00:00Z",
  "releaseNotes": [
    "Latest updates and improvements"
  ],
  "priority": "normal"
}
```

---

## Technical Details

### Version Format

| Component | Source | Example |
|:----------|:-------|:--------|
| Year | Current Saudi date | 2026 |
| Month | Current Saudi date | 02 |
| Day | Current Saudi date | 02 |
| Build number | Auto-increment or reset daily | 001 |

### Timestamp Handling

- Script generates UTC timestamp at build time
- Display component converts to Saudi Arabia time (already implemented)
- Example: Build at 1:30 PM Saudi time stores as `10:30:00Z` (UTC), displays as `1:30 PM`

---

## Files to Create/Modify

| File | Action | Purpose |
|:-----|:-------|:--------|
| `scripts/update-version.js` | Create | Auto-update version and timestamp |
| `package.json` | Modify | Add prebuild script |
| `public/version.json` | Auto-updated | Will be updated by script on each build |

---

## Expected Behavior After Implementation

1. **Every time you publish**: `version.json` is automatically updated with current date/time
2. **Version number**: Reflects the Saudi Arabia date (e.g., `2026.02.02.001`)
3. **Published time**: Shows the actual build time in Saudi Arabia timezone
4. **No manual updates needed**: Everything happens automatically during the build process
