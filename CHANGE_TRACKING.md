# Change Tracking for Authentication Fixes

This document tracks all changes made to fix authentication issues (Chrome Incognito, 401 errors).
Created: 2025-06-24

## Firebase UID Reference
- Firebase Auth uses: `uid` (lowercase)
- DecodedIdToken: `decodedToken.uid`
- UserRecord: `userRecord.uid`
- Frontend User type: mapped to `id`

## Files to Modify

### 1. Incognito Detection Utility
**File:** `/src/lib/utils/browser-detection.ts` (NEW FILE)
**Purpose:** Detect private/incognito browsing mode
**Changes:** Create new utility file

### 2. Warning Banner Component
**File:** `/src/components/ui/IncognitoWarning.tsx` (NEW FILE)
**Purpose:** Show warning for incognito users
**Changes:** Create new component

### 3. Authentication Hook Updates
**File:** `/src/hooks/useAuth.tsx`
**Purpose:** Add incognito detection and better error handling
**Changes:**
- Add incognito detection
- Improve error messages
- Add debug logging

### 4. Auth Toggle Component
**File:** `/src/components/auth/AuthToggle.tsx`
**Purpose:** Show incognito warning in login/signup form
**Changes:**
- Import and use IncognitoWarning component
- Add debug logging

### 5. Session Route Debug
**File:** `/src/app/api/auth/session/route.ts`
**Purpose:** Add debug logging
**Changes:**
- Log cookie headers
- Log session verification results

### 6. Login Route Debug
**File:** `/src/app/api/auth/login/route.ts`
**Purpose:** Add debug logging
**Changes:**
- Log Set-Cookie headers
- Log cookie configuration

### 7. Firebase Auth Debug
**File:** `/src/lib/auth/firebase-auth.ts`
**Purpose:** Add debug logging to cookie operations
**Changes:**
- Log in setSessionCookie()
- Log in getSessionCookie()
- Log in getCurrentUser()

## Rollback Instructions

To rollback all changes:
1. Delete new files:
   - `/src/lib/utils/browser-detection.ts`
   - `/src/components/ui/IncognitoWarning.tsx`
2. Revert modified files using git:
   ```bash
   git checkout -- src/hooks/useAuth.tsx
   git checkout -- src/components/auth/AuthToggle.tsx
   git checkout -- src/app/api/auth/session/route.ts
   git checkout -- src/app/api/auth/login/route.ts
   git checkout -- src/lib/auth/firebase-auth.ts
   ```

## Implementation Status
- [x] Incognito detection utility - COMPLETED
- [x] Warning banner component - COMPLETED
- [x] useAuth hook updates - NOT NEEDED (kept simple)
- [x] AuthToggle updates - COMPLETED
- [x] API route debug logging - COMPLETED
- [ ] Test in Chrome Incognito
- [ ] Test in Edge
- [ ] Test in regular Chrome

## Changes Made:
1. Added `DEBUG_AUTH=false` to .env.example
2. Created `/src/lib/utils/browser-detection.ts` - Detects incognito mode
3. Created `/src/components/ui/IncognitoWarning.tsx` - Shows warning banner
4. Updated `/src/lib/auth/firebase-auth.ts` - Added debug logging
5. Updated `/src/app/api/auth/session/route.ts` - Added debug logging
6. Updated `/src/app/api/auth/login/route.ts` - Added debug logging  
7. Updated `/src/components/auth/AuthToggle.tsx` - Added IncognitoWarning component
8. **CRITICAL FIX**: Updated `middleware.ts` - Fixed cookie name mismatch (was checking 'mhg-auth-session' instead of 'session')
9. Updated `/src/app/api/auth/session/route.ts` - Auto-clear invalid session cookies
10. Updated `/src/lib/auth/firebase-auth.ts` - Better error handling for missing users
11. **CRITICAL FIX**: Updated `/src/components/auth/AuthToggle.tsx` - Replaced client-side navigation (router.push) with server-side redirect (window.location.href) to fix auth state sync issues
12. Updated `/src/app/medical-disclaimer/page.tsx` - Replaced setTimeout + router.push with window.location.href for consistent server-side redirects
13. Updated `/src/hooks/useVoice.ts` - Added better error logging and visual feedback for speech recognition
14. Updated `/src/lib/utils/voice.ts` - Added Safari/Mac warning and microphone permission check
15. Updated `/src/components/medication/VoiceInput.tsx` - Hide voice input for Safari/Mac users (not supported)
16. **UX FIX**: Updated `/src/components/medication/VoiceInput.tsx` - Improved voice input visual feedback:
    - Changed from red/danger color to blue/primary when active
    - Removed confusing MicOff icon (kept regular Mic icon)
    - Added blue ring and green recording dot when active
    - Added animated dots for "Listening..." indicator
    - Simple tap/click activation (no holding required)
17. **Voice Input Improvements**:
    - Updated `/src/components/medication/MedicationForm.tsx` - Better centered voice button position
    - Updated `/src/components/medication/VoiceInput.tsx` - Added 45-second timer with countdown
    - Updated `/src/lib/utils/voice.ts` - Changed to continuous mode (doesn't stop after first word)
    - Made green recording dot larger with white border for visibility
    - Added z-index to ensure "Listening" popup is visible
    - Disabled auto-stop so it keeps listening until user stops or timeout
18. **Voice Input UX Overhaul** - Changed to press-and-hold pattern:
    - Updated `/src/components/medication/VoiceInput.tsx`:
      - Changed from tap-to-toggle to press-and-hold
      - Hold microphone button = recording, Release = stop
      - Reduced timer to 30 seconds
      - Green "Speak now!" message when recording
      - Shows "Release button to stop" instruction
      - Larger microphone icon (h-6 w-6)
      - Works with mouse, touch, and keyboard (spacebar)

## Notes
- All debug logs use `process.env.DEBUG_AUTH` flag (server-side only)
- No breaking changes to existing functionality
- Graceful degradation approach

## Auth Flow Fix Explanation
The client-side navigation (router.push) was causing race conditions where:
1. User logs in successfully
2. Client navigates to dashboard before auth state updates
3. Dashboard's withAuth HOC sees no auth state and redirects to /auth
4. Middleware sees session cookie and redirects to /dashboard
5. Creates redirect loop

Using window.location.href ensures:
- Full page reload with fresh session state
- No race conditions between client/server state
- Consistent behavior across all browsers
- Eliminates need for setTimeout delays