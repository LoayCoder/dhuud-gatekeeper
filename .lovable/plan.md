

# Fix Speech-to-Text: Language Detection and Text Stuttering

## Problems Identified

### Problem 1: Arabic speech transcribed as English letters
The `recognition.lang` is set correctly to `ar-SA` via `LANG_MAP`, but `continuous: true` combined with `interimResults: true` causes the Web Speech API on some browsers/devices to fall back to the browser's default language (English) when it can't confidently match Arabic in continuous mode. The recognition instance captures the `lang` value at creation time, which should be correct — but `continuous` mode is less reliable for non-English languages.

### Problem 2: Stuttering/repeating text ("there is there is there is worker...")
With `continuous: true`, the Web Speech API fires `onresult` events where each new result rebuilds from the beginning of the current speech segment. While the code uses `event.resultIndex` to skip old results, in `continuous` mode the same result index can flip between interim and final multiple times, causing the same phrase to be appended repeatedly.

## Fix Strategy

Rewrite the `useSpeechToText` hook to use **non-continuous mode with auto-restart**:

1. **Set `continuous = false`** — Each recognition session captures one clean utterance and fires a single final result
2. **Auto-restart on `onend`** — If still "listening" (user hasn't pressed stop), immediately restart recognition for the next sentence
3. **Track accumulated text via ref** — Store a `baseTextRef` capturing the field value at the start of listening, and an `accumulatedRef` for all appended segments. Show interim text as a preview but only commit final results
4. **Remove interim appending** — Only append finalized transcript segments to the description field
5. **Add language debug logging** — Log the resolved BCP-47 language tag when recognition starts

### Files to Change

**`src/hooks/use-speech-to-text.ts`** — Core rewrite:
- `continuous = false` instead of `true`
- Add `shouldRestartRef` to track if auto-restart is needed on `onend`
- In `onend`: if `shouldRestartRef` is true, create a new recognition instance and start it (this also re-applies the latest `lang`)
- Keep `interimResults = true` for visual feedback, but only call `onTranscript` for `isFinal` results
- Log `recognition.lang` at start for debugging

No changes needed to `Step1Capture.tsx` or `QuickObservationCardFormDetails.tsx` — the hook API stays the same.

## Technical Detail

```text
Before (continuous mode):
  User says: "worker fell from second floor"
  Events: interim "worker" → interim "worker fell" → interim "worker fell from" → ...
  With continuous=true, resultIndex stays 0, same segment keeps updating
  Bug: final fires multiple times for overlapping segments → repeated text

After (non-continuous + auto-restart):
  User says: "worker fell from second floor"
  Events: interim → interim → interim → FINAL "worker fell from second floor" → onend
  onend → auto-restart new session
  User says: "he was injured"
  Events: interim → FINAL "he was injured" → onend
  Result: clean appended text with no stuttering
```

