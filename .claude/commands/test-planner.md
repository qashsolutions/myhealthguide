# Test Planner

Generate comprehensive test cases for the MyGuide Health application.

## Test Categories

### 1. Input Validation Tests
Generate test cases for all form fields:
- Required field validation
- Min/max length constraints
- Format validation (email, phone, dates)
- XSS prevention
- SQL injection prevention
- Error message display

### 2. Authentication Tests
- Email verification required before data entry
- Mobile verification required before data entry
- Public sections accessible without auth:
  - Symptom Checker (/symptom-checker)
  - Care Community (/tips)
  - Features (/features)
  - Pricing (/pricing)
- Protected sections require auth:
  - Dashboard (/dashboard/*)
  - Settings (/dashboard/settings)
  - Elder management

### 3. Subscription Plan Tests

#### Plan A - Family Plan A ($8.99/month)
- 45-day free trial
- 1 caregiver (admin role) - full write access
- 1 elder maximum
- 1 member (read-only access)
- Test: Cannot add 2nd elder
- Test: Cannot add 2nd member

#### Plan B - Family Plan B ($10.99/month)
- 45-day free trial
- 1 caregiver (admin role) - full write access
- 1 elder maximum
- 3 members (read-only access)
- Test: Cannot add 2nd elder
- Test: Cannot add 4th member

#### Plan C - Multi Agency ($16.99/elder/month)
- 30-day free trial
- 1 superadmin (subscriber)
  - Can add caregivers (max 10)
  - Can add elders
  - Can assign caregivers to elders
  - Can view all data
  - CANNOT write to elder data directly
- Up to 10 caregivers per agency
- Up to 3 elders per caregiver
- Up to 2 members per elder (read-only + FCM)

### 4. RBAC Tests
- Role-based access control for each plan
- Permission denied scenarios
- Data isolation between groups/agencies

### 5. CRUD Operations
- Create, Read, Update, Delete for:
  - Elders
  - Medications
  - Supplements
  - Diet entries
  - Notes
  - Incidents

### 6. FCM Notification Tests
- Push notification delivery
- Notification preferences
- Token management

### 7. Boundary Tests
- Max limits for each plan
- Trial expiration behavior
- Upgrade/downgrade scenarios

## Output Format
Generate test cases as a checklist:
```
## [Category]
- [ ] Test case description
  - Precondition: ...
  - Steps: ...
  - Expected: ...
```

## Usage
When invoked, ask which category of tests to generate, or generate all.
