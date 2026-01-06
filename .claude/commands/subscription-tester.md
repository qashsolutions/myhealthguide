# Subscription Tester

Test subscription plans, billing, trials, and plan limits.

## Subscription Plans

### Plan A - Family Plan A
| Feature | Value |
|---------|-------|
| Price | $8.99/month |
| Trial | 45 days |
| Elders | 1 max |
| Caregivers | 1 (admin) |
| Members | 1 (read-only) |
| Stripe Price ID | `STRIPE_FAMILY_PRICE_ID` |

### Plan B - Family Plan B
| Feature | Value |
|---------|-------|
| Price | $18.99/month |
| Trial | 45 days |
| Elders | 1 max |
| Caregivers | 1 (admin) |
| Members | 3 (read-only) |
| Stripe Price ID | `STRIPE_SINGLE_AGENCY_PRICE_ID` |

### Plan C - Multi Agency
| Feature | Value |
|---------|-------|
| Price | $55/elder/month |
| Trial | 30 days |
| Caregivers | 10 max |
| Elders/Caregiver | 3 max |
| Members/Elder | 2 max |
| Stripe Price ID | `STRIPE_MULTI_AGENCY_PRICE_ID` |

---

## Test Cases

### Trial Period Tests

#### Plan A & B (45-day trial)
- [ ] New signup starts 45-day trial
- [ ] Trial countdown displays correctly
- [ ] Full access during trial
- [ ] Warning at 7 days remaining
- [ ] Warning at 3 days remaining
- [ ] Trial expiry blocks access to dashboard
- [ ] Can subscribe after trial expires
- [ ] Trial dates stored correctly in Firestore

#### Plan C (30-day trial)
- [ ] New signup starts 30-day trial
- [ ] Trial countdown displays correctly
- [ ] Full access during trial
- [ ] Trial expiry behavior

---

### Boundary Tests

#### Plan A Limits
- [ ] Can add 1 elder ✅
- [ ] Cannot add 2nd elder ❌ (show upgrade prompt)
- [ ] Can invite 1 member ✅
- [ ] Cannot invite 2nd member ❌ (show upgrade prompt)

#### Plan B Limits
- [ ] Can add 1 elder ✅
- [ ] Cannot add 2nd elder ❌ (show upgrade prompt)
- [ ] Can invite 3 members ✅
- [ ] Cannot invite 4th member ❌ (show upgrade prompt)

#### Plan C Limits
- [ ] Can add 10 caregivers ✅
- [ ] Cannot add 11th caregiver ❌
- [ ] Caregiver can have 3 elders ✅
- [ ] Caregiver cannot have 4th elder ❌
- [ ] Elder can have 2 members ✅
- [ ] Elder cannot have 3rd member ❌

---

### Stripe Integration Tests

#### Checkout Flow
- [ ] Pricing page displays correct prices
- [ ] "Start Trial" initiates Stripe checkout
- [ ] Stripe checkout loads correctly
- [ ] Successful payment creates subscription
- [ ] User record updated with subscription status
- [ ] Redirect to dashboard after success

#### Webhook Tests
- [ ] `checkout.session.completed` updates user
- [ ] `customer.subscription.updated` syncs status
- [ ] `customer.subscription.deleted` handles cancellation
- [ ] `invoice.payment_failed` handles failures

#### Billing Portal
- [ ] Can access Stripe billing portal
- [ ] Can update payment method
- [ ] Can view invoices
- [ ] Can cancel subscription

---

### Upgrade/Downgrade Tests

#### Upgrade Path
- [ ] Plan A → Plan B (more members)
- [ ] Plan A → Plan C (agency features)
- [ ] Plan B → Plan C (agency features)
- [ ] Prorated billing on upgrade
- [ ] Immediate access to new features

#### Downgrade Path
- [ ] Plan C → Plan B (check elder/member limits)
- [ ] Plan B → Plan A (check member limits)
- [ ] Warning if over new plan limits
- [ ] Grace period for data adjustment

---

### Cancellation Tests
- [ ] Can cancel subscription
- [ ] Access continues until period end
- [ ] Data retained after cancellation
- [ ] Can resubscribe after cancellation

---

## Test Execution

### Stripe Test Mode
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

### API Endpoints to Test
```
POST /api/create-checkout-session
POST /api/billing/portal
POST /api/billing/cancel
GET  /api/billing/subscriptions
POST /api/billing/change-plan
GET  /api/billing/trial-check
```

### Firestore Fields to Verify
```typescript
user: {
  subscriptionStatus: 'trialing' | 'active' | 'canceled' | 'past_due',
  subscriptionTier: 'family_plan_a' | 'family_plan_b' | 'multi_agency',
  trialEndDate: Timestamp,
  stripeCustomerId: string,
  stripeSubscriptionId: string
}
```

## Report Format
```
## Subscription Test Report

### Plan: [Plan Name]
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Trial days | 45 | 45 | ✅ |
| Max elders | 1 | 1 | ✅ |
| ... | ... | ... | ... |

### Stripe Integration
- Checkout: ✅/❌
- Webhooks: ✅/❌
- Portal: ✅/❌

### Issues Found
1. [Description]
```
