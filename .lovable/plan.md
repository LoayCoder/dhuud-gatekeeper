
Goal: make voice input clearer on mobile and make Arabic speech easy to select even when the app UI stays English.

What is confusing now
- The tiny `EN` chip is a cycle button, not an explicit selector, so users have to tap repeatedly and guess the current speech language.
- The `Auto` checkbox in the footer is for AI auto-analysis, but it sits beside the speech controls and looks related to voice language.
- Browser “auto-detect” is not reliable enough for Arabic, so the UI should guide users toward choosing Arabic directly.

Implementation plan

1. Replace the current speech-language cycle chip with an explicit selector
- Refactor `src/hooks/use-speech-to-text.ts` to expose:
  - current speech language
  - a direct `setSpeechLang(...)`
  - a small list of selectable options
- Keep explicit languages first (`Arabic`, `English`, etc.)
- Keep `Auto`, but label it as secondary/beta so it is not treated as the recommended path for Arabic

2. Build a clearer shared speech toolbar UI
- Create one reusable speech-controls component for both forms
- Show a labeled control such as `Speech language`
- Use a dropdown / compact menu instead of a cycling chip, so users can choose `Arabic` in one tap
- Show a clear recording state like `Listening in Arabic`
- Add helper text: `App language and speech language are separate`

3. Separate AI controls from speech controls
- In both forms, split the footer into clearer groups:
  - AI group: auto-analysis toggle + AI analyze button
  - Voice group: speech language selector + microphone button
- On the current small viewport, stack these groups into 2 rows so they do not look connected

4. Improve the default behavior for English UI + Arabic speech
- If the UI is English, keep speech selectable independently
- Do not rely on `Auto` for Arabic guidance
- Add a short hint near the selector when `Auto` is chosen, e.g. `For Arabic, select Arabic for best results`

5. Apply the same improvement in both reporting flows
- `src/pages/incidents/IncidentReport/Step1Capture.tsx`
- `src/features/incidents/components/QuickObservationCard/QuickObservationCardFormDetails.tsx`
- Reuse the same shared speech toolbar so both screens behave identically

6. Add proper translations
- Add new user-facing labels to all locale files under `src/locales/*/translation.json`
- Examples:
  - speech language
  - app language and speech language are separate
  - listening in {{language}}
  - auto detect (beta)
  - for Arabic, select Arabic

Files involved
- `src/hooks/use-speech-to-text.ts`
- `src/pages/incidents/IncidentReport/Step1Capture.tsx`
- `src/features/incidents/components/QuickObservationCard/QuickObservationCardFormDetails.tsx`
- new shared speech control component inside the incidents feature
- `src/locales/en/translation.json`
- `src/locales/ar/translation.json`
- `src/locales/ur/translation.json`
- `src/locales/hi/translation.json`
- `src/locales/fil/translation.json`

Expected result
- A user can keep the UI in English and explicitly choose Arabic for voice input in one tap
- The screen no longer suggests that AI `Auto` and speech `Auto` are the same thing
- The mobile layout is cleaner and the active speech language is obvious before the user starts speaking
