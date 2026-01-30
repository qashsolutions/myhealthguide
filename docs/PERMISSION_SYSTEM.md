# Permission System Documentation

> **Last Updated:** January 5, 2026
> **Status:** Current state documentation + planned improvements

---

## Overview

MyGuide.Health uses a role-based permission system with three subscription tiers. Each tier has different user roles with specific access levels.

---

## Subscription Plans

### Family Plan A (`family`)
- **Price:** $8.99/elder/month
- **Trial:** 15 days
- **Target:** Individual caregivers managing one elder

| Limit | Value |
|-------|-------|
| Max Elders | 1 |
| Max Members | 2 (1 Owner + 1 Viewer) |
| Max Groups | 1 |
| Storage | 25 MB |

### Family Plan B / Small Agency (`single_agency`)
- **Price:** $10.99/month (Updated Jan 27, 2026)
- **Trial:** 15 days
- **Target:** Families with multiple people involved in care

| Limit | Value |
|-------|-------|
| Max Elders | 1 |
| Max Members | 4 (1 Owner + 3 Viewers) |
| Max Groups | 1 |
| Storage | 50 MB |

### Multi-Agency Plan (`multi_agency`)
- **Price:** $16.99/elder/month (Updated Jan 27, 2026)
- **Trial:** 15 days
- **Target:** Professional caregiving agencies

| Limit | Value |
|-------|-------|
| Max Elders | 30 |
| Max Caregivers | 10 |
| Max Elders per Caregiver | 3 |
| Max Members per Caregiver | 2 *(to be implemented)* |
| Max Groups | 10 |
| Storage | 500 MB |

---

## Role Hierarchy

### Family Plans (A & B)

```
┌─────────────────────────────────────────────────────────────┐
│  OWNER (1)                                                  │
│  ─────────                                                  │
│  • Full control over elder care data                        │
│  • Add/edit/delete medications, supplements, diet           │
│  • Log doses and activities                                 │
│  • Invite and remove members                                │
│  • Manage group settings                                    │
│  • View all reports and insights                            │
├─────────────────────────────────────────────────────────────┤
│  VIEWERS (1-3 depending on plan)                            │
│  ───────                                                    │
│  • View all care data (read-only)                           │
│  • Receive push notifications                               │
│  • View reports and insights                                │
│  • Cannot edit or log any data                              │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Agency Plan

```
┌─────────────────────────────────────────────────────────────┐
│  SUPER ADMIN / OWNER (1)                                    │
│  ────────────────────────                                   │
│  • Full control over entire agency                          │
│  • Create and manage groups                                 │
│  • Invite and assign caregivers to elders                   │
│  • View all caregivers' data                                │
│  • Manage agency settings and billing                       │
│  • Transfer ownership                                       │
├─────────────────────────────────────────────────────────────┤
│  CAREGIVERS (up to 10)                                      │
│  ──────────                                                 │
│  • Write access ONLY to assigned elders (max 3)             │
│  • Log doses, add notes, update care data                   │
│  • View reports for assigned elders                         │
│  • Invite family members for assigned elders (max 2 each)   │
│  • Cannot see other caregivers' elders                      │
│  • Cannot modify agency settings                            │
├─────────────────────────────────────────────────────────────┤
│  VIEWERS / Family Members                                   │
│  ───────────────────────                                    │
│  • Read-only access to specific elder                       │
│  • Receive push notifications                               │
│  • View reports for their elder                             │
│  • Invited by caregiver OR super admin                      │
└─────────────────────────────────────────────────────────────┘
```

**Note:** Elders never access the system directly - they have caregivers because they cannot manage their own care.

---

## Data Model

### Role Fields

```typescript
// Group membership role (stored in group.members[])
role: 'admin' | 'member' | 'agency_caregiver'

// Permission level (simplified access control)
permissionLevel: 'admin' | 'write' | 'read'

// Agency-specific roles
AgencyRole: 'super_admin' | 'caregiver_admin' | 'caregiver' | 'family_member'
```

### UI Display Mapping

| Data Value | UI Display | Icon | Color |
|------------|------------|------|-------|
| `role: 'admin'` | **Owner** | Crown | Purple |
| `isCaregiver: true` | **Caregiver** | Stethoscope | Blue |
| `role: 'member'` | **Viewer** | Eye | Gray |

### Firestore Collections

| Collection | Purpose |
|------------|---------|
| `groups` | Group data with members array |
| `groups.members[]` | Member objects with role and permissionLevel |
| `groups.writeMemberIds[]` | Denormalized array for Firestore rule checks |
| `caregiver_assignments` | Caregiver-to-elder assignments |
| `users/{uid}/elder_access/{elderId}` | Subcollection for caregiver elder access |
| `users/{uid}/group_access/{groupId}` | Subcollection for caregiver group access |

---

## Permission Enforcement

### Layer 1: Firestore Security Rules

```javascript
// Key functions in firestore.rules
isGroupAdmin(groupId)        // Is user the group admin?
hasWritePermission(groupId)  // Is admin OR in writeMemberIds?
isMemberOfGroup(groupId)     // Is user a member?
isCaregiverAssignedToElder() // Has elder_access subcollection?
hasActiveAccess(userId)      // Has valid subscription/trial?
```

### Layer 2: API Route Authorization

- Token verification via Firebase Admin SDK
- Role checks before data modifications
- Business logic enforcement (max limits, etc.)

### Layer 3: UI Access Control

- Components check user role before rendering
- Action buttons hidden/disabled based on permissions
- Navigation filtered by subscription tier

---

## Current Implementation Status

### Working Features

| Feature | Family A | Family B | Multi-Agency |
|---------|----------|----------|--------------|
| Owner manages elders | ✅ | ✅ | ✅ |
| Owner invites viewers | ✅ | ✅ | ✅ |
| Viewers read-only | ✅ | ✅ | ✅ |
| Caregiver assignment | N/A | N/A | ✅ |
| Caregiver elder limit (3) | N/A | N/A | ✅ |
| Caregiver invites family | N/A | N/A | ⚠️ Partial |

### Gaps Identified

1. **`maxMembersPerCaregiver` not defined** - Need to add limit of 2
2. **Caregiver invite UI missing** - Caregivers can't invite their own family members
3. **Terminology inconsistencies** - Some places still say "Admin" instead of "Owner"

---

## Terminology Standards

### Roles (User-Facing)

| Term | Usage | Avoid |
|------|-------|-------|
| **Owner** | Group/agency creator with full control | Admin, Super Admin (internal only) |
| **Caregiver** | Professional caregiver with write access | Write Member |
| **Viewer** | Read-only family member | Member, Read Member |

### Actions (User-Facing)

| Term | Usage |
|------|-------|
| **Invite** | Adding new members/caregivers |
| **Remove** | Removing members from group |
| **Assign** | Assigning caregivers to elders |

### Internal (Code Only)

| Term | Context |
|------|---------|
| `admin` | Database role value for owner |
| `member` | Database role value for viewer |
| `super_admin` | Agency owner role |
| `permissionLevel` | Access tier (admin/write/read) |

---

## Files Reference

### Types
- `src/types/index.ts` - All type definitions

### Configuration
- `src/lib/subscription/subscriptionService.ts` - Plan limits and features

### Components
- `src/components/group/PermissionManager.tsx` - Permission UI
- `src/components/group/MemberCard.tsx` - Member display
- `src/components/agency/CaregiverInviteManager.tsx` - Caregiver invites

### API Routes
- `src/app/api/groups/[groupId]/members/route.ts` - Get members
- `src/app/api/groups/[groupId]/permissions/route.ts` - Update permissions
- `src/app/api/caregiver/assign-elder/route.ts` - Assign caregivers

### Security
- `firestore.rules` - Database security rules

---

## Planned Improvements

### Phase 1: Configuration
- [ ] Add `maxMembersPerCaregiver: 2` to multi_agency config

### Phase 2: Caregiver Member Invites
- [ ] Create invite UI for caregivers
- [ ] Track which caregiver invited which member
- [ ] Enforce max 2 members per caregiver limit

### Phase 3: Terminology Cleanup
- [ ] Audit all UI strings for consistency
- [ ] Update help articles
- [ ] Update error messages

---

## Change Log

| Date | Change |
|------|--------|
| Jan 5, 2026 | Initial documentation created |
| Jan 5, 2026 | Identified gaps in caregiver member invites |
