

# Fix: Arabic Speech Recognition Not Working

## Root Cause

The speech recognition language is tied to `i18n.language` (the app's UI language). If the user is using the app in English but speaks Arabic, the recognition is set to `en-US` and will transcribe Arabic speech as English gibberish. Even if the app is set to Arabic, some browsers ignore the `lang` property in certain conditions.

## Fix Strategy

**Two changes:**

1. **Remove hard-binding to UI language** — Instead of always using `i18n.language`, don't force a language on the Speech API when the user might speak in a different language than the UI. Chrome's Speech API has good auto-detection when `lang` is not set.

2. **Add a speech language toggle button** — Place a small language indicator chip next to the mic button that shows the current speech language (e.g., "AR" / "EN"). Tapping it cycles through supported languages. This lets users speak Arabic even when the UI is in English.

### Files to Change

- **`src/hooks/use-speech-to-text.ts`** — Add a `speechLang` state that defaults to `i18n.language` but can be overridden. Return `speechLang` and `setSpeechLang` from the hook. When `speechLang` is set to `'auto'`, omit setting `recognition.lang` entirely so the browser auto-detects.

- **`src/pages/incidents/IncidentReport/Step1Capture.tsx`** — Add a small language badge/chip next to the mic button showing the active speech language. Clicking it cycles: current UI lang → `ar` → `en` → `auto` (or the supported set).

- **`src/features/incidents/components/QuickObservationCard/QuickObservationCardFormDetails.tsx`** — Same language toggle chip next to the mic button.

### Technical Details

```text
Hook API change:
  useSpeechToText({ lang, onTranscript, ... })
  returns: { ..., speechLang, cycleSpeechLang }

speechLang cycles through: [current i18n lang, ...other supported langs, 'auto']
When 'auto': recognition.lang is NOT set → browser auto-detects
When specific: recognition.lang = LANG_MAP[speechLang]

UI: Small chip like [AR] or [EN] or [Auto] next to mic button
```

