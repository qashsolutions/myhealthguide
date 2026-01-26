---
name: skill-voice-input-area
description: Voice/text input bar on the home screen for logging observations and issuing voice commands. Use when implementing the voice input field, speech-to-text bar, observation input, or the "say or type" component. Wires into existing voice command system.
---

## Objective

Add an always-visible voice/text input bar on the caregiver home screen. This is the primary way caregivers log observations, navigate, and interact with the app — especially for our 65-year-old target user who may prefer speaking to typing.

## Constraints

- DO NOT rebuild voice recognition logic — wire into existing `src/lib/voice/voiceNavigation.ts`
- DO NOT create a new speech-to-text service — use existing Web Speech API integration
- MUST work offline (show appropriate state when offline)
- MUST be accessible (large tap target, clear states, screen reader support)
- MUST appear on family caregiver AND agency caregiver home screens (NOT agency owner)
- Position: below DayProgress bar, above SuggestionChips

## Files to Read First

- `src/lib/voice/voiceNavigation.ts` — Existing voice command routing (40+ commands)
- `src/lib/voice/voiceRecognition.ts` — If exists, Web Speech API wrapper
- `src/hooks/useVoiceRecognition.ts` — If exists, voice recognition hook
- `src/components/voice/` — Any existing voice UI components
- `src/app/dashboard/page.tsx` — Where this component will be placed

## Component Design

### Visual Layout

```
┌─────────────────────────────────────────────────┐
│  [🎤]  Say or type what happened...             │
└─────────────────────────────────────────────────┘

States:
1. IDLE:
   ┌─────────────────────────────────────────────┐
   │  [🎤 gray]  Say or type what happened...    │
   └─────────────────────────────────────────────┘

2. LISTENING:
   ┌─────────────────────────────────────────────┐
   │  [🎤 blue pulse]  Listening...              │
   └─────────────────────────────────────────────┘

3. TRANSCRIBING:
   ┌─────────────────────────────────────────────┐
   │  [spinner]  "gave martha her morning meds"  │
   └─────────────────────────────────────────────┘

4. ERROR:
   ┌─────────────────────────────────────────────┐
   │  [🎤 red]  Couldn't hear. Tap to try again │
   └─────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Create VoiceInputArea Component

Create `src/components/dashboard/VoiceInputArea.tsx`:

```typescript
'use client';

interface VoiceInputAreaProps {
  onCommand?: (command: string) => void;
  placeholder?: string;
}

// Component structure:
// - Outer container: rounded-full border, h-12, flex items-center, px-4
// - Left: Mic button (40px tap target, rounded-full)
// - Center: text input OR transcription display
// - Behavior: tap mic = voice, tap text = keyboard input

States:
- idle: mic gray, placeholder visible
- listening: mic blue with pulse animation, "Listening..." text
- processing: spinner replacing mic, transcription text shown
- error: mic red, error message, tap to retry
- success: brief green flash, then return to idle
```

### Step 2: Wire Voice Recognition

```typescript
// Connect to existing voice system:
import { processVoiceCommand } from '@/lib/voice/voiceNavigation';

const handleVoiceResult = (transcript: string) => {
  // 1. Try to match a voice command
  const result = processVoiceCommand(transcript);

  if (result.matched) {
    // Navigate or execute the matched command
    router.push(result.route);
    showToast(`Going to ${result.label}`);
  } else {
    // Unrecognized: send to AI chat or show as note
    router.push(`/dashboard/ask-ai?q=${encodeURIComponent(transcript)}`);
  }
};
```

### Step 3: Handle Text Input

```typescript
// When user types and presses Enter:
const handleTextSubmit = (text: string) => {
  // Same routing as voice
  const result = processVoiceCommand(text);
  if (result.matched) {
    router.push(result.route);
  } else {
    router.push(`/dashboard/ask-ai?q=${encodeURIComponent(text)}`);
  }
};
```

### Step 4: Mic Button Animation

```css
/* Pulsing animation for listening state */
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.listening .mic-pulse {
  animation: pulse-ring 1.5s infinite;
}
```

Use Tailwind `animate-ping` or custom keyframes. Respect `prefers-reduced-motion`.

### Step 5: Integrate into GuidedHome

In the home screen layout, place between DayProgress and SuggestionChips:

```tsx
<DayProgress completed={completedCount} total={totalCount} />
<VoiceInputArea placeholder="Say or type what happened..." />
<SuggestionChips ... />
```

## Accessibility

- Mic button: `aria-label="Start voice input"` (idle), `aria-label="Stop listening"` (active)
- Input field: `aria-label="Type an observation or command"`
- Live region for transcription: `aria-live="polite"`
- Minimum touch target: 48x48px for mic button
- High contrast mic icon in all states

## Testing Requirements

- Tap mic triggers voice recognition (or shows permission prompt)
- Transcribed text routes through processVoiceCommand
- Text input routes the same way
- Unrecognized commands go to AI chat
- Error state shows on recognition failure
- Works offline (shows offline message if no speech API)
- Large enough touch targets for elderly users
- Run: `npm test -- --testPathPattern="voice|Voice"`
