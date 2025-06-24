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

## Notes
- All debug logs use `process.env.NEXT_PUBLIC_DEBUG_AUTH` flag
- No breaking changes to existing functionality
- Graceful degradation approach