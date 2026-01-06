# RBAC Tester

Test Role-Based Access Control for all subscription plans.

## Plan A & Plan B - Family Plans

### Roles
1. **Caregiver (Admin)** - The subscriber
   - Full write access to elder data
   - Can invite members
   - Can manage medications, supplements, diet, notes
   - Can view all reports and insights

2. **Member** - Invited by admin
   - Read-only access to elder data
   - Cannot add/edit/delete any data
   - Can receive FCM notifications
   - Can view reports

### Test Cases - Family Plans

#### Caregiver Admin Tests
- [ ] Can create elder profile
- [ ] Can edit elder profile
- [ ] Can add medications
- [ ] Can edit medications
- [ ] Can delete medications
- [ ] Can add supplements
- [ ] Can add diet entries
- [ ] Can create notes
- [ ] Can invite members
- [ ] Can remove members
- [ ] Can view all data

#### Member Tests (Read-Only)
- [ ] Can view elder profile (NOT edit)
- [ ] Can view medications (NOT add/edit/delete)
- [ ] Can view supplements (NOT add/edit/delete)
- [ ] Can view diet entries (NOT add/edit/delete)
- [ ] Can view notes (NOT create/edit/delete)
- [ ] Cannot invite other members
- [ ] Receives FCM notifications
- [ ] Permission denied on write attempts

---

## Plan C - Multi Agency

### Roles
1. **Superadmin** - The subscriber/agency owner
   - Can subscribe and manage billing
   - Can add caregivers (max 10)
   - Can add elders to the agency
   - Can assign caregivers to elders (max 3 elders per caregiver)
   - Can view ALL agency data
   - **CANNOT write to elder data directly** (medications, supplements, etc.)

2. **Caregiver** - Added by superadmin
   - Full write access to ASSIGNED elders only
   - Cannot access unassigned elders
   - Can manage medications, supplements, diet for assigned elders
   - Can invite members for their assigned elders

3. **Member** - Invited by caregiver
   - Read-only access to specific elder
   - Receives FCM notifications
   - Cannot write any data

### Test Cases - Multi Agency

#### Superadmin Tests
- [ ] Can add caregivers (up to 10)
- [ ] Cannot add 11th caregiver (boundary)
- [ ] Can add elders to agency
- [ ] Can assign caregiver to elder
- [ ] Cannot assign 4th elder to a caregiver (max 3)
- [ ] Can view all caregivers' data
- [ ] Can view all elders' data
- [ ] **Cannot add medication** (permission denied)
- [ ] **Cannot edit elder health data** (permission denied)
- [ ] Can remove caregivers
- [ ] Can reassign elders

#### Caregiver Tests
- [ ] Can write to assigned elder's data
- [ ] Cannot access unassigned elder (permission denied)
- [ ] Can add medications for assigned elder
- [ ] Can add supplements for assigned elder
- [ ] Can add diet entries for assigned elder
- [ ] Can create notes for assigned elder
- [ ] Can invite members (max 2 per elder)
- [ ] Cannot invite 3rd member per elder (boundary)

#### Member Tests
- [ ] Read-only access to assigned elder
- [ ] Cannot write any data (permission denied)
- [ ] Receives FCM notifications
- [ ] Cannot access other elders

---

## Data Isolation Tests

### Cross-Group Access
- [ ] User A cannot access User B's elders
- [ ] User A cannot access User B's medications
- [ ] Agency A caregivers cannot access Agency B data

### API Security
- [ ] API returns 403 for unauthorized access
- [ ] Firestore rules block unauthorized reads
- [ ] Firestore rules block unauthorized writes

---

## Test Execution

### Manual Testing Steps
1. Create test accounts for each role
2. Login as each role
3. Attempt each action in the checklist
4. Verify expected behavior (allow/deny)
5. Check error messages are appropriate

### Automated Testing
```bash
npm run test:e2e -- --grep "rbac"
```

## Report Format
```
## RBAC Test Report - [Plan Type]

### Role: [Role Name]
| Action | Expected | Actual | Status |
|--------|----------|--------|--------|
| Add medication | Allow/Deny | Allow/Deny | ✅/❌ |
| ... | ... | ... | ... |

### Issues Found
1. [Issue description]
   - Expected: ...
   - Actual: ...
   - Severity: High/Medium/Low
```
