---
name: skill-more-menu
description: Drawer/menu component housing all features hidden from main view. Use when implementing the More menu, feature drawer, settings access, or secondary navigation. All existing features remain accessible through this menu. Depends on skill-layout-system.
---

## Objective

Create a "More" menu (drawer on mobile, panel on desktop) that houses ALL features not shown in the bottom nav or icon rail. No features are removed -- they are just moved behind one tap.

## Constraints

- MUST include EVERY existing route/feature from the old sidebar
- MUST be accessible from both BottomNav "More" and IconRail "More"
- MUST preserve existing role-based visibility (some items only for admins)
- MUST use existing shadcn/ui Sheet/Drawer component if available
- MUST close on navigation (route change)

## Files to Read First

- `src/components/shared/Sidebar.tsx` -- Complete list of all nav items
- `src/components/shared/BottomNav.tsx` -- From skill-layout-system (to connect)
- `src/components/shared/IconRail.tsx` -- From skill-layout-system (to connect)
- `src/components/ui/sheet.tsx` -- Existing drawer component (shadcn)
- `src/app/dashboard/` -- List all page directories to map routes
- `src/types/index.ts` -- User roles and subscription types

## Complete Feature Inventory

Map ALL existing sidebar items + any hidden features:

### Primary Features (Previously in Sidebar)
| Feature | Route | Icon | Roles |
|---------|-------|------|-------|
| Daily Care | /dashboard/daily-care | Heart | All |
| Loved Ones | /dashboard/elders | Users | All |
| Health Insights | /dashboard/health-insights | Brain | All |
| Medications | /dashboard/medications | Pill | All |
| Supplements | /dashboard/supplements | Leaf | All |
| Reports | /dashboard/reports | FileText | All |
| Community Tips | /dashboard/tips | Lightbulb | All |

### Agency Features (Multi-Agency Plan Only)
| Feature | Route | Icon | Roles |
|---------|-------|------|-------|
| Scheduling | /dashboard/scheduling | Calendar | Caregiver, Super Admin |
| Caregiver Mgmt | /dashboard/caregivers | UserCog | Super Admin |
| Timesheets | /dashboard/timesheets | Clock | Super Admin |
| Agency Settings | /dashboard/agency | Building | Super Admin |

### Settings & Account
| Feature | Route | Icon | Roles |
|---------|-------|------|-------|
| Profile | /dashboard/profile | User | All |
| Settings | /dashboard/settings | Settings | All |
| Subscription | /dashboard/subscription | CreditCard | Admin |
| Notifications | /dashboard/notifications | Bell | All |
| Help & Support | /dashboard/help | HelpCircle | All |

### Utility Actions
| Feature | Action | Icon | Roles |
|---------|--------|------|-------|
| Voice Commands | Open voice modal | Mic | All |
| Dark Mode | Toggle theme | Moon/Sun | All |
| Logout | Sign out | LogOut | All |

## Implementation Steps

### Step 1: Create MoreMenu Component

Create `src/components/shared/MoreMenu.tsx`:

```typescript
Purpose: Full-screen drawer (mobile) or side panel (desktop) with all features

Mobile (<640px):
- Full-screen sheet from bottom (96vh height)
- Drag handle at top
- Grouped sections with dividers
- Large touch targets (48px rows)
- Close button (X) top-right

Desktop (>=640px):
- Panel slides from left (320px wide)
- Or overlay panel from icon rail
- Same content, scrollable

Structure:
<Sheet>
  <SheetContent side="bottom" className="h-[96vh] sm:h-full sm:w-80 sm:side-left">
    <header>More</header>
    <ScrollArea>
      <section title="Care">
        <MenuItem icon={Heart} label="Daily Care" href="/dashboard/daily-care" />
        <MenuItem icon={Users} label="Loved Ones" href="/dashboard/elders" />
        ...
      </section>
      <Separator />
      <section title="Insights">
        <MenuItem icon={Brain} label="Health Insights" href="/dashboard/health-insights" />
        <MenuItem icon={FileText} label="Reports" href="/dashboard/reports" />
        ...
      </section>
      <Separator />
      {isAgencyPlan && (
        <section title="Agency">
          <MenuItem icon={Calendar} label="Scheduling" href="/dashboard/scheduling" />
          ...
        </section>
      )}
      <Separator />
      <section title="Account">
        <MenuItem icon={Settings} label="Settings" href="/dashboard/settings" />
        ...
      </section>
    </ScrollArea>
  </SheetContent>
</Sheet>
```

### Step 2: Create MenuItem Component

Create `src/components/shared/MenuItem.tsx`:

```typescript
Props:
- icon: LucideIcon
- label: string
- href?: string (for navigation)
- onClick?: () => void (for actions)
- badge?: string | number (notification count)
- description?: string (subtitle text)
- disabled?: boolean
- rightIcon?: LucideIcon (ChevronRight for sub-menus)

Display:
- 48px height row
- Icon (20px) + label (16px) + optional badge (right side)
- Hover/active state with background highlight
- Optional description in 12px secondary text below label
```

### Step 3: Wire to Navigation Components

In `BottomNav.tsx` and `IconRail.tsx`:
```typescript
const [moreOpen, setMoreOpen] = useState(false);

// "More" button onClick:
<button onClick={() => setMoreOpen(true)}>
  <Menu className="w-5 h-5" />
  <span>More</span>
</button>

<MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
```

### Step 4: Role-Based Filtering

```typescript
const { user } = useAuth();
const { subscription } = useSubscription();

const isAgencyPlan = subscription?.plan === 'multi-agency';
const isSuperAdmin = user?.role === 'super_admin';
const isAdmin = user?.role === 'admin' || isSuperAdmin;
const isFamilyMember = user?.role === 'member' && !user?.writePermission;

// Filter menu items based on role
const menuSections = useMemo(() => filterByRole(allSections, {
  isAgencyPlan, isSuperAdmin, isAdmin, isFamilyMember
}), [isAgencyPlan, isSuperAdmin, isAdmin, isFamilyMember]);
```

### Step 5: Search/Filter (Optional Enhancement)

```typescript
// Top of MoreMenu: search field
<Input
  placeholder="Search features..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="mb-4"
/>

// Filter menu items by search query
// Useful for users who know what they want but can't find it
```

## Animation & Transitions

- Mobile: Slide up from bottom with spring animation (200ms)
- Desktop: Slide in from left (150ms)
- Items: Stagger-in animation on open (50ms each)
- Close: Slide down/left (150ms)
- Backdrop: fade in/out (150ms)

## Testing Requirements

- All existing routes accessible via More menu
- Role filtering: agency items hidden for family plan
- Role filtering: admin items hidden for family members
- Opens from BottomNav "More" button
- Opens from IconRail "More" button
- Closes on route navigation
- Closes on backdrop tap
- Closes on X button
- Responsive: full screen on mobile, panel on desktop
- Run: `npm test -- --testPathPattern=MoreMenu`
