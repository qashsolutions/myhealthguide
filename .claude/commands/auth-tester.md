# Auth Tester

Test authentication, verification, and session management.

## Authentication Methods

### Email Authentication
- Firebase Auth with email/password
- Email verification required before data entry

### Phone Authentication
- Firebase Auth with phone number
- SMS verification code
- +1 prefix auto-added for US numbers
- Phone verification required before data entry

---

## Test Cases

### 1. Email + Password Signup

#### Happy Path
- [ ] Navigate to /signup
- [ ] Enter valid name, email, password
- [ ] Submit form successfully
- [ ] Verification email sent
- [ ] User redirected appropriately
- [ ] User record created in Firestore

#### Validation
- [ ] Invalid email format rejected
- [ ] Weak password rejected (< 8 chars)
- [ ] Duplicate email shows error
- [ ] All required fields enforced

---

### 2. Phone Signup

#### Happy Path
- [ ] Navigate to /phone-signup
- [ ] Enter name and 10-digit phone
- [ ] reCAPTCHA completes
- [ ] SMS code sent
- [ ] Enter 6-digit code
- [ ] Account created successfully
- [ ] Redirect to dashboard

#### Validation
- [ ] 9-digit phone rejected
- [ ] 11-digit phone rejected
- [ ] Invalid code rejected
- [ ] Expired code rejected
- [ ] +1 auto-prefixed

#### Navigation Links
- [ ] "Sign up with email" link works
- [ ] "Already have an account? Sign in" link works

---

### 3. Email Verification

#### Flow
- [ ] Unverified user sees verification banner
- [ ] Verification email contains valid link
- [ ] Clicking link verifies email
- [ ] User status updated in Firestore
- [ ] Banner disappears after verification

#### Restrictions Before Verification
- [ ] Cannot add elders
- [ ] Cannot access protected features
- [ ] Prompted to verify email

---

### 4. Phone Verification

#### Flow
- [ ] Unverified phone shows verification prompt
- [ ] Can request SMS code
- [ ] Valid code verifies phone
- [ ] User status updated in Firestore

#### Restrictions Before Verification
- [ ] Cannot add elders (requires both email + phone)
- [ ] Prompted to verify phone

---

### 5. Login

#### Email Login
- [ ] Navigate to /login
- [ ] Enter valid credentials
- [ ] Successful login redirects to dashboard
- [ ] Invalid email shows error
- [ ] Invalid password shows error
- [ ] "Forgot password" link works

#### Phone Login
- [ ] Navigate to /phone-login
- [ ] Enter registered phone number
- [ ] Receive SMS code
- [ ] Valid code logs in
- [ ] Invalid code rejected

---

### 6. Password Reset

#### Flow
- [ ] Navigate to /forgot-password
- [ ] Enter registered email
- [ ] Reset email sent
- [ ] Click reset link
- [ ] Enter new password
- [ ] Password updated successfully
- [ ] Can login with new password

#### Validation
- [ ] Unregistered email shows appropriate message
- [ ] Expired reset link handled
- [ ] New password meets requirements

---

### 7. Session Management

#### Session Persistence
- [ ] Session persists on page refresh
- [ ] Session persists on browser close/reopen
- [ ] Session expires after inactivity (if configured)

#### Session Tracking
- [ ] Session created in Firestore on login
- [ ] Session events logged
- [ ] Session associated with user

#### Logout
- [ ] Logout clears session
- [ ] Redirect to home/login page
- [ ] Cannot access protected routes after logout

---

### 8. Public vs Protected Sections

#### Public (No Auth Required)
- [ ] / (Home)
- [ ] /about
- [ ] /features
- [ ] /pricing
- [ ] /tips (Care Community)
- [ ] /symptom-checker
- [ ] /login
- [ ] /signup
- [ ] /phone-signup
- [ ] /phone-login

#### Protected (Auth Required)
- [ ] /dashboard/* - Redirects to login
- [ ] /dashboard/settings - Redirects to login
- [ ] /dashboard/medications - Redirects to login
- [ ] All dashboard routes protected

#### Verification Required (Auth + Verified)
- [ ] Adding elders requires email + phone verified
- [ ] Data entry requires verification

---

### 9. FCM Token Management

#### Token Registration
- [ ] FCM token generated on login
- [ ] Token stored in Firestore
- [ ] Token refreshed when needed

#### Token Updates
- [ ] New token replaces old on re-login
- [ ] Multiple device tokens supported
- [ ] Token removed on logout (optional)

#### Notification Delivery
- [ ] Push notifications received when app in background
- [ ] In-app notifications shown when app in foreground

---

### 10. Security Tests

#### Brute Force Protection
- [ ] Rate limiting on login attempts
- [ ] Account lockout after failures (if implemented)

#### Token Security
- [ ] Auth tokens not exposed in URL
- [ ] Tokens expire appropriately
- [ ] Refresh token rotation

#### XSS in Auth Forms
- [ ] Login form sanitizes input
- [ ] Signup form sanitizes input

---

## Test Execution

### Manual Testing
1. Create fresh test accounts
2. Test each flow end-to-end
3. Verify Firestore records
4. Check Firebase Auth console

### Test Accounts
```
Email: test-plana@example.com
Phone: +15551234567
Password: TestPassword123!
```

### API Endpoints
```
POST /api/auth/update-email
GET  /api/client-ip (for rate limiting)
```

### Firestore Collections
```
users/{userId}
sessions/{sessionId}
sessionEvents/{eventId}
```

## Report Format
```
## Auth Test Report

### Signup Flow
| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Email signup | Account created | Account created | ✅ |
| Verification email | Sent | Sent | ✅ |
| ... | ... | ... | ... |

### Login Flow
| Method | Result | Status |
|--------|--------|--------|
| Email/Password | Success | ✅ |
| Phone/SMS | Success | ✅ |

### Session Management
- Session persistence: ✅/❌
- Logout: ✅/❌
- FCM tokens: ✅/❌

### Issues Found
1. [Description]
   - Steps to reproduce
   - Expected vs Actual
   - Severity
```
