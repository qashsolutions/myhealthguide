# Input Validator

Test input validation across all forms in the application.

## Validation Categories

### 1. Required Field Validation
Test that required fields:
- Show error when empty
- Block form submission
- Display appropriate error message
- Clear error when filled

### 2. Length Validation
| Field Type | Min | Max | Test Cases |
|------------|-----|-----|------------|
| Name fields | 1 | 100 | Empty, 1 char, 101 chars |
| Email | 5 | 254 | Too short, too long |
| Phone | 10 | 10 | 9 digits, 11 digits |
| Password | 8 | 128 | 7 chars, valid, 129 chars |
| Description | 0 | 5000 | Empty (if optional), over limit |
| Notes | 0 | 10000 | Over limit |

### 3. Format Validation

#### Email Format
- [ ] Valid: `user@example.com` ✅
- [ ] Valid: `user.name+tag@example.co.uk` ✅
- [ ] Invalid: `user@` ❌
- [ ] Invalid: `@example.com` ❌
- [ ] Invalid: `user@.com` ❌
- [ ] Invalid: `user example.com` ❌

#### Phone Format (US +1)
- [ ] Valid: `5551234567` (10 digits) ✅
- [ ] Invalid: `555123456` (9 digits) ❌
- [ ] Invalid: `55512345678` (11 digits) ❌
- [ ] Invalid: `555-123-4567` (with dashes - should strip)
- [ ] Auto-prefix: +1 added automatically

#### Date Format
- [ ] Valid date picker selection ✅
- [ ] Invalid: Future birth date ❌
- [ ] Invalid: Date > 150 years ago ❌
- [ ] Valid: Medication start date in future ✅

#### Age Validation
- [ ] Valid: 1-120 ✅
- [ ] Invalid: 0 ❌
- [ ] Invalid: -1 ❌
- [ ] Invalid: 121 ❌
- [ ] Invalid: Non-numeric ❌

---

### 4. Security Validation

#### XSS Prevention
Test these inputs are sanitized:
```
<script>alert('xss')</script>
<img src=x onerror=alert('xss')>
javascript:alert('xss')
<svg onload=alert('xss')>
"><script>alert('xss')</script>
'><script>alert('xss')</script>
```

**Test in:**
- [ ] Elder name field
- [ ] Medication name field
- [ ] Notes/description fields
- [ ] Search fields
- [ ] All text inputs

**Expected:** Input is escaped/sanitized, no script execution

#### SQL Injection Prevention
Test these inputs:
```
'; DROP TABLE users; --
' OR '1'='1
" OR "1"="1
1; DELETE FROM users
' UNION SELECT * FROM users --
```

**Expected:** Input treated as literal text, no database impact

#### NoSQL Injection Prevention (Firestore)
Test these inputs:
```
{"$gt": ""}
{"$ne": null}
{"$where": "function() { return true; }"}
```

**Expected:** Input treated as literal, no query manipulation

---

### 5. Form-Specific Tests

#### Signup Form
| Field | Validation |
|-------|------------|
| First Name | Required, 1-100 chars |
| Last Name | Required, 1-100 chars |
| Email | Required, valid format |
| Password | Required, min 8 chars |
| Phone | Required for phone signup, 10 digits |

#### Elder Profile Form
| Field | Validation |
|-------|------------|
| Name | Required, 1-100 chars |
| Age | Required, 1-120 |
| Gender | Required, select option |
| Medical conditions | Optional, max 5000 chars |

#### Medication Form
| Field | Validation |
|-------|------------|
| Name | Required, 1-200 chars |
| Dosage | Required |
| Frequency | Required, select option |
| Start date | Required, valid date |
| Instructions | Optional, max 1000 chars |

#### Symptom Checker Form
| Field | Validation |
|-------|------------|
| Age | Required, 1-120 |
| Gender | Required, select option |
| Symptoms | Required, 10-5000 chars |

---

### 6. Error Message Tests
- [ ] Error messages are user-friendly (not technical)
- [ ] Error messages indicate how to fix the issue
- [ ] Errors appear near the relevant field
- [ ] Multiple errors shown simultaneously
- [ ] Errors clear when corrected
- [ ] Form doesn't submit with errors

---

## Test Execution

### Manual Testing
1. Navigate to each form
2. Test each validation rule
3. Verify error messages
4. Test form submission blocking
5. Test successful submission with valid data

### Automated Testing
```bash
npm run test:e2e -- --grep "validation"
```

### Security Testing Tools
- Browser DevTools (inspect sanitized output)
- Check Network tab for escaped payloads
- Verify Firestore rules block malicious queries

## Report Format
```
## Input Validation Report

### Form: [Form Name]
| Field | Test | Expected | Actual | Status |
|-------|------|----------|--------|--------|
| Email | Empty | Error | Error | ✅ |
| Email | Invalid format | Error | Error | ✅ |
| Email | XSS payload | Sanitized | Sanitized | ✅ |

### Security Tests
| Attack Type | Payload | Result | Status |
|-------------|---------|--------|--------|
| XSS | <script>... | Escaped | ✅ |
| SQLi | ' OR '1'='1 | Literal | ✅ |

### Issues Found
1. [Field] - [Issue description]
   - Severity: High/Medium/Low
   - Fix: [Suggested fix]
```
