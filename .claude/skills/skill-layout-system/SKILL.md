---
name: skill-layout-system
description: Core responsive layout system replacing sidebar with bottom nav (mobile) and icon rail (desktop/tablet). Use when implementing the new navigation structure, bottom nav bar, icon rail, minimal header, or responsive breakpoints. Handles mobile (<640px), tablet (640-1024px), and desktop (>1024px) layouts.
---

## Objective

Replace the current 256px sidebar + 7-icon header with:
- **Mobile (<640px)**: Bottom navigation bar (4-5 items) + minimal header
- **Tablet (640-1024px)**: 56px icon rail (left) + minimal header
- **Desktop (>1024px)**: 56px icon rail (left) + minimal header + wider content area

## Constraints

- DO NOT modify: Authentication logic, API calls, Payment flows, DB queries, Service worker
- DO NOT remove any existing routes or pages -- only change how they are accessed
- MUST preserve: `ProtectedRoute`, `ElderProvider`, `FCMProvider` wrappers in layout
- MUST use existing Tailwind CSS + shadcn/ui patterns
- MUST use Lucide React icons (already installed)
- Terminology: "Elder" = "Loved One" in user-facing text only

## Files to Read First

- `src/app/dashboard/layout.tsx` -- Current layout wrapper (PRIMARY file to modify)
- `src/components/shared/Sidebar.tsx` -- Current sidebar (to understand all nav items)
- `src/components/shared/DashboardHeader.tsx` -- Current header (to understand all actions)
- `src/components/shared/MobileNav.tsx` -- If exists, check current mobile nav
- `tailwind.config.ts` -- Existing breakpoints and theme

## Implementation Steps

### Step 1: Create Bottom Navigation Component

Create `src/components/shared/BottomNav.tsx`:

```
Purpose: Fixed bottom nav bar for mobile (<640px)
Items (5 max):
1. Home (House icon) -- /dashboard
2. Care (Heart icon) -- /dashboard/daily-care
3. Voice (Mic icon) -- triggers voice input modal (center, raised 56px circle)
4. Bell (Bell icon) -- opens notification dropdown (red badge with unread count)
5. More (Menu icon) -- opens MoreMenu drawer (avatar/profile/settings accessible here)

Behavior:
- Fixed position bottom-0
- 64px height (with safe area padding)
- Active item highlighted with primary color
- Bell icon shows red badge with unread notification count
- Hidden on tablet/desktop (hidden sm:hidden md:hidden lg:hidden)
- Safe area padding for iOS (pb-safe)
```

### Step 2: Create Icon Rail Component

Create `src/components/shared/IconRail.tsx`:

```
Purpose: Fixed left icon rail for tablet/desktop (>=640px)
Width: 56px
TOP SECTION (primary navigation):
1. Home (House icon) -- /dashboard
2. Care (Heart icon) -- /dashboard/daily-care
3. Elders (Users icon) -- /dashboard/elder-profile
4. Schedule (Calendar icon) -- only for Multi-Agency plan
5. Notes (FileText icon) -- /dashboard/notes
6. More (Menu icon) -- opens MoreMenu drawer

--- flex-grow spacer ---

BOTTOM SECTION (utility, bottom-left):
7. Bell icon (with red unread badge) -- opens notification dropdown
   → Reuse existing useNotifications hook + NotificationItem component
8. User Avatar (initials circle) -- THIS is the ONLY avatar in the layout
   → Tapping opens dropdown: Profile, Settings, Sign Out

Visual layout:
┌──┐
│🏠│  ← Top: Nav
│❤️│
│📋│
│⭐│
│☰ │
│  │  ← spacer
│🔔│  ← Bottom: Utility
│VC│
└──┘

DO NOT include:
- NO app icon/badge ("MG") at top of rail
- NO separate Settings/gear icon (avatar handles this)
- The logo text is in the header, NOT the rail

Behavior:
- Fixed position left-0, full height
- Tooltip on hover showing label
- Active item highlighted with primary background circle
- Hidden on mobile (hidden sm:block)
- Bell badge: red circle with unread count (reuse existing notification count logic)
- Avatar at absolute bottom of rail (mt-auto)
```

### Step 3: Create Minimal Header Component

Create `src/components/shared/MinimalHeader.tsx`:

```
Purpose: Replace DashboardHeader with ultra-minimal version
Height: 48px (mobile), 56px (desktop)
Items:
- Left: App name text "MyHealthGuide" (rendered as: <span font-bold>MyHealth</span><span font-light text-blue-600>Guide</span>)
- Right: NOTHING — header is ONLY the logo text

DO NOT include in header:
- NO notification bell (bell is in icon rail / bottom nav)
- NO user avatar (avatar is in icon rail bottom ONLY)
- NO "MG" app icon badge
- NO search bar
- NO elder selector dropdown
- NO theme toggle
- NO accessibility button
- NO hamburger menu (bottom nav handles mobile nav)

Behavior:
- Sticky top-0, z-30
- Border-bottom for visual separation
- On desktop: add left padding to account for 56px icon rail
```

### Step 4: Update Dashboard Layout

Modify `src/app/dashboard/layout.tsx`:

```
Replace:
- Sidebar component with IconRail (tablet/desktop) + BottomNav (mobile)
- DashboardHeader with MinimalHeader
- Adjust main content padding:
  - Mobile: pb-16 (bottom nav space), pt-12 (header)
  - Tablet/Desktop: pl-14 (icon rail space), pt-12 (header)
```

### Step 5: Responsive CSS

```
Breakpoints (existing Tailwind defaults):
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

Content max-width: 640px on mobile, 768px on tablet, 1024px on desktop
Center content with mx-auto
```

## Testing Requirements

- All existing routes must remain accessible
- Navigation state must persist across page changes
- PWA install prompt must still work
- FCM notification banner must render above bottom nav
- Voice input modal must render above bottom nav
- Verify on: 390px (iPhone), 768px (iPad), 1280px (Desktop)
- Run: `npm run build` -- no TypeScript errors
- Run existing tests: `npm test`

## Role-Specific Behavior

- **Family Plan (A/B)**: Hide Schedule icon from icon rail
- **Multi-Agency Caregiver**: Show Schedule icon
- **Multi-Agency Super Admin**: Show all icons + admin badge on More
- **Family Member (read-only)**: Hide Voice icon, show read-only indicator

## References

- Current sidebar items: Dashboard, Daily Care, Elders, Health Insights, Scheduling, Reports, Community Tips, Settings
- Lucide icons to use: `House`, `Heart`, `Mic`, `Bell`, `Menu`, `Calendar`, `Users`
- NOT needed: `Settings` icon (removed — avatar handles settings), app icon badge (removed)
- App name in UI: "MyHealthGuide" (NOT "MyGuide", NOT "MyGuide.Health")
- Avatar placement: ONLY at bottom of IconRail (desktop) or inside "More" menu (mobile)
- Bell placement: In IconRail (desktop) or BottomNav (mobile) — NOT in header
- Header contains: ONLY logo text "MyHealthGuide" — nothing else
