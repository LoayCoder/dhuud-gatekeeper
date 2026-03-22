

# Add Speech-to-Text for Description Fields

## What
Add a microphone button next to the description textarea in both the Incident Report form and the Quick Observation form. When tapped, the browser's built-in Web Speech API transcribes the user's voice in real-time, appending text into the description field as they speak.

## Where (2 locations)
1. **Incident/Observation Report** — `src/pages/incidents/IncidentReport/Step1Capture.tsx` (line 112, the description Textarea)
2. **Quick Observation Card** — `src/features/incidents/components/QuickObservationCard/QuickObservationCardFormDetails.tsx` (line 83, the description Textarea)

## Implementation

### Step 1: Create `useSpeechToText` hook
New file: `src/hooks/use-speech-to-text.ts`

- Uses the browser-native `webkitSpeechRecognition` / `SpeechRecognition` API (no external dependencies needed)
- Accepts: `onTranscript(text: string)` callback, `lang` parameter (from i18n)
- Returns: `{ isListening, startListening, stopListening, isSupported }`
- Sets `interimResults = true` so the user sees words appearing live
- On `onresult`, calls `onTranscript` with the final transcript which appends to the current field value
- Handles errors gracefully (microphone permission denied, unsupported browser)
- Auto-stops after silence or max duration (60s safety)

### Step 2: Add mic button to Step1Capture description field
- Import the hook, wire `onTranscript` to append to `form.setValue('description', current + ' ' + transcript)`
- Add a small `Mic` / `MicOff` icon button next to the AI Analyze button in the footer row
- While listening, show a pulsing red dot indicator
- Hide button entirely if `!isSupported` (e.g. Firefox on some platforms)

### Step 3: Add mic button to QuickObservationCardFormDetails
- Same pattern: mic toggle button next to the AI analyze button
- Same hook, same append logic

### Step 4: Export from hooks barrel
- Add `use-speech-to-text` export to `src/hooks/common/index.ts`

## Technical Details
- **No API key required** — Web Speech API is built into Chrome, Edge, Safari, and most mobile browsers
- **RTL-aware** — button placement will respect the existing `direction` prop
- **PWA-compatible** — works in installed PWA mode on Android/iOS Safari
- **Language support** — passes `i18n.language` (e.g. `ar-SA`, `en-US`) to recognition for correct transcription
- **Appends, not replaces** — each speech segment appends to existing text so users can mix typing and voice

