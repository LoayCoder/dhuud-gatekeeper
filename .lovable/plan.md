

# Add Version Number to Home Screen

## Overview
Add the app version number and its build timestamp next to the date/time display in the WelcomeCompact component. This helps users verify they're running the latest version.

## Current State
The WelcomeCompact component displays:
- Welcome message with user's first name
- Current date and time (e.g., "Sun, Feb 1 • 05:47 PM")

## Proposed Change
Add a new line showing:
- Version number (e.g., "v2026.01.22.001")
- Build date formatted in user's locale (e.g., "Jan 22, 2026")

**Example Display:**
```
Welcome, Ahmed 👋
Sun, Feb 1 • 05:47 PM
v2026.01.22.001 • Jan 22, 2026
```

## Implementation Details

### File: `src/components/home/WelcomeCompact.tsx`

**Changes:**
1. Import the `useVersionInfo` hook
2. Extract `version` and `buildDate` from the hook
3. Add a helper function to format the build date in the user's locale
4. Add a new line below the date/time showing version info

**Code Structure:**
```
Line 50 (current):
  {formatDate(currentTime)} • {formatTime(currentTime)}

Line 51 (new):
  v{version} • {formattedBuildDate}
```

### Styling
- Same styling as date/time line (`text-xs text-muted-foreground`)
- Subtle appearance that doesn't distract from the main content
- Supports RTL layout automatically via existing `text-start` class

### Loading State
- While version info is loading, show a subtle skeleton or omit the version line
- This prevents layout shift and provides clean UX

## Technical Notes
- Uses existing `useVersionInfo` hook - no new API calls needed
- Leverages existing translation keys (`pwa.version`)
- Build date formatting uses `Intl.DateTimeFormat` for proper RTL/locale support
- No database changes required

