---
name: skill-voice-integration
description: Wire existing voice command system into the new layout components. Use when integrating voice input, speech recognition, voice commands, or the voice modal into the bottom nav, guided home, or priority card. Depends on skill-layout-system and skill-guided-home.
---

## Objective

Integrate the existing voice command system (40+ commands, fuzzy matching) into the new layout. The voice system is FULLY BUILT -- this skill only wires it into new UI touch points.

## Constraints

- DO NOT rewrite voice recognition logic -- it works
- DO NOT modify `voiceNavigation.ts` command definitions
- MUST connect voice to: VoiceInputArea, BottomNav mic button, SuggestionChips
- MUST preserve existing voice command routing
- MUST handle: start/stop listening, transcription display, error states
- Web Speech API is already implemented

## Files to Read First

- `src/lib/voice/voiceNavigation.ts` -- Command definitions and routing (DO NOT MODIFY)
- `src/lib/voice/speechRecognition.ts` -- Web Speech API wrapper (if exists)
- `src/hooks/useVoiceInput.ts` -- Existing voice hook (if exists)
- `src/components/voice/` -- Any existing voice components
- `src/components/dashboard/VoiceInputArea.tsx` -- From skill-guided-home
- `src/components/shared/BottomNav.tsx` -- Mic button integration point

## Existing Voice System Architecture

```
User speaks → Web Speech API → transcript text
  → voiceNavigation.matchCommand(transcript)
    → if matched: router.push(matchedRoute)
    → if not matched: send to AI chat
```

### Existing Command Categories (from voiceNavigation.ts)
- Navigation: "go to medications", "open daily care", "show elders"
- Actions: "log medication", "add note", "record meal"
- Queries: "what's due", "show schedule", "today's tasks"
- Control: "stop listening", "cancel", "go back"

## Implementation Steps

### Step 1: Create Voice Modal Component

Create `src/components/voice/VoiceModal.tsx`:

```typescript
Purpose: Full-screen voice input overlay (triggered from BottomNav or VoiceInputArea)

States:
1. IDLE: Large mic button, "Tap to speak" text
2. LISTENING: Pulsing mic animation, live transcript text, "Listening..." label
3. PROCESSING: Spinner, "Understanding..." label, final transcript shown
4. MATCHED: Green checkmark, matched command shown, auto-navigating in 1s
5. UNMATCHED: Shows transcript, "I'll help with that" → routes to AI chat
6. ERROR: Red mic, "Couldn't hear you. Tap to try again"

Display (full-screen overlay):
+------------------------------------------+
|                              [X close]   |
|                                          |
|         [  Large Mic Button  ]           |
|              (64px circle)               |
|                                          |
|      "Log morning medications"           |  <- Live transcript
|                                          |
|   Suggestions:                           |
|   "Log medication" | "Add note"          |  <- Voice hints
|   "What's due"     | "Show schedule"     |
|                                          |
+------------------------------------------+

Behavior:
- Opens with fade-in (150ms)
- Mic auto-starts listening on open (if permission granted)
- Shows 4-6 example phrases as hints
- Closes automatically after successful command match (1s delay)
- Close on X or swipe down
```

### Step 2: Connect VoiceInputArea to Voice System

In `src/components/dashboard/VoiceInputArea.tsx`:

```typescript
// Import existing voice hooks
import { useVoiceInput } from '@/hooks/useVoiceInput'; // or equivalent

export function VoiceInputArea() {
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [textInput, setTextInput] = useState('');

  // Mic icon tap = open voice modal
  const handleMicTap = () => setVoiceModalOpen(true);

  // Text input submit = process as command
  const handleTextSubmit = (text: string) => {
    const matched = voiceNavigation.matchCommand(text);
    if (matched) {
      router.push(matched.route);
    } else {
      // Route to AI chat with pre-filled text
      router.push(`/dashboard/chat?q=${encodeURIComponent(text)}`);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-xl">
        <button onClick={handleMicTap}>
          <Mic className="w-5 h-5 text-muted-foreground" />
        </button>
        <input
          placeholder="What would you like to do?"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit(textInput)}
          className="flex-1 bg-transparent text-sm"
        />
      </div>
      <VoiceModal open={voiceModalOpen} onClose={() => setVoiceModalOpen(false)} />
    </>
  );
}
```

### Step 3: Connect BottomNav Mic Button

In `src/components/shared/BottomNav.tsx`:

```typescript
// Center button (Voice) opens the VoiceModal
<button
  onClick={() => setVoiceModalOpen(true)}
  className="flex flex-col items-center justify-center"
>
  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center -mt-4">
    <Mic className="w-6 h-6 text-primary-foreground" />
  </div>
  <span className="text-xs mt-1">Voice</span>
</button>
```

### Step 4: Voice-to-Action for Priority Card

When voice is used from the home screen context:

```typescript
// Special voice commands when PriorityCard is visible:
const priorityVoiceCommands = {
  "mark as given": () => handleComplete(currentTask.id),
  "done": () => handleComplete(currentTask.id),
  "skip": () => handleSkip(currentTask.id),
  "skip this one": () => handleSkip(currentTask.id),
  "next": () => handleSkip(currentTask.id),
  "log it": () => handleComplete(currentTask.id),
  "taken": () => handleComplete(currentTask.id),
};

// Register these as priority commands when PriorityCard is mounted
```

### Step 5: Suggestion Chips Voice Integration

When user taps a suggestion chip with text like "Log breakfast":
```typescript
// Pre-fill the voice/text input area with the chip text
// Then auto-execute the command
const handleChipTap = (chipText: string) => {
  const matched = voiceNavigation.matchCommand(chipText);
  if (matched) {
    router.push(matched.route);
  }
};
```

## Microphone Permission Flow

```typescript
// First-time voice use:
1. Show permission prompt: "MyGuide needs microphone access for voice commands"
2. If granted: proceed to listen
3. If denied: show text-only input, hide mic button
4. Store permission state in localStorage

// Check on component mount:
const hasMicPermission = await navigator.permissions.query({ name: 'microphone' });
```

## Accessibility

- Voice modal announces state changes to screen reader
- Keyboard shortcut: Ctrl+M or Cmd+M to toggle voice
- Voice hints are readable by screen reader
- Error states provide clear recovery instructions
- Works without voice (text input fallback always available)

## Testing Requirements

- Voice modal opens from BottomNav mic button
- Voice modal opens from VoiceInputArea mic icon
- Existing 40+ voice commands still route correctly
- Priority card voice commands work (mark as given, skip)
- Text input fallback works when mic is denied
- Modal closes after successful command
- Error state shows on recognition failure
- Run: `npm test -- --testPathPattern=voice`
