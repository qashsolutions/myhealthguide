/**
 * Playwright Auth Helpers
 * UI interaction helpers for authentication flows
 */

import { Page, expect } from '@playwright/test';
import { TEST_CONFIG, TestUserData } from './test-config';

/**
 * Dismiss cookie consent banner if present
 */
export async function dismissCookieConsent(page: Page): Promise<void> {
  try {
    // Wait briefly for cookie banner to appear
    await page.waitForTimeout(1500);

    // Look for cookie consent buttons - check multiple patterns
    const buttonPatterns = [
      'button:has-text("Accept All Cookies")',
      'button:has-text("Accept All")',
      'button:has-text("Essential Only")',
      'button:has-text("Accept")',
      'button:has-text("Got it")',
      'button:has-text("I understand")',
      'button:has-text("OK")',
      'button:has-text("Agree")',
      'button:has-text("Allow")',
    ];

    for (const pattern of buttonPatterns) {
      const button = page.locator(pattern).first();
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await button.click({ force: true });
        await page.waitForTimeout(500);
        return;
      }
    }
  } catch {
    // Cookie banner might not be present, that's fine
  }
}

/**
 * Fill and submit email signup form
 */
export async function signUpWithEmail(
  page: Page,
  userData: TestUserData
): Promise<void> {
  await page.goto('/signup');
  await page.waitForLoadState('domcontentloaded');

  // Fill first name
  const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="First"]').first();
  if (await firstNameInput.isVisible()) {
    await firstNameInput.fill(userData.firstName);
  }

  // Fill last name
  const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="Last"]').first();
  if (await lastNameInput.isVisible()) {
    await lastNameInput.fill(userData.lastName);
  }

  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  await emailInput.fill(userData.email);

  // Fill password
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(userData.password);

  // Fill confirm password if exists
  const confirmPasswordInput = page.locator('input[name="confirmPassword"], input[placeholder*="Confirm"]').first();
  if (await confirmPasswordInput.isVisible().catch(() => false)) {
    await confirmPasswordInput.fill(userData.password);
  }

  // Fill phone if visible
  const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();
  if (await phoneInput.isVisible().catch(() => false)) {
    // Remove +1 prefix if input expects raw number
    const phoneDigits = userData.phone.replace(/^\+1/, '').replace(/\D/g, '');
    await phoneInput.fill(phoneDigits);
  }

  // Accept terms if checkbox exists
  const termsCheckbox = page.locator('input[type="checkbox"]').first();
  if (await termsCheckbox.isVisible().catch(() => false)) {
    await termsCheckbox.check();
  }

  // Submit form
  const submitButton = page.getByRole('button', { name: /sign ?up|create|register|submit/i }).first();
  await submitButton.click();

  // Wait for navigation or response
  await page.waitForTimeout(2000);
}

/**
 * Fill and submit email login form
 */
export async function loginWithEmail(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  await emailInput.fill(email);

  // Fill password
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  // Submit form
  const submitButton = page.getByRole('button', { name: /log ?in|sign ?in|submit/i }).first();
  await submitButton.click();

  // Wait for navigation or response
  await page.waitForTimeout(2000);
}

/**
 * Navigate to phone login and enter phone number
 */
export async function startPhoneLogin(
  page: Page,
  phoneNumber: string
): Promise<void> {
  await page.goto('/phone-login');
  await page.waitForLoadState('domcontentloaded');

  // Find phone input
  const phoneInput = page.locator('input[type="tel"], input[name*="phone"]').first();
  await expect(phoneInput).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });

  // Remove +1 prefix if input expects raw number
  const phoneDigits = phoneNumber.replace(/^\+1/, '').replace(/\D/g, '');
  await phoneInput.fill(phoneDigits);

  // Submit to get OTP
  const submitButton = page.getByRole('button', { name: /send|continue|verify|submit/i }).first();
  await submitButton.click();

  // Wait for reCAPTCHA or OTP input
  await page.waitForTimeout(3000);
}

/**
 * Enter OTP code
 */
export async function enterOTP(page: Page, otp: string): Promise<void> {
  // OTP can be in a single input or multiple inputs
  const otpInput = page.locator('input[name*="otp"], input[name*="code"], input[type="tel"][maxlength="6"]').first();

  if (await otpInput.isVisible().catch(() => false)) {
    await otpInput.fill(otp);
  } else {
    // Multiple digit inputs
    const digitInputs = page.locator('input[maxlength="1"]');
    const count = await digitInputs.count();
    for (let i = 0; i < count && i < otp.length; i++) {
      await digitInputs.nth(i).fill(otp[i]);
    }
  }

  // Submit OTP
  const submitButton = page.getByRole('button', { name: /verify|submit|continue/i }).first();
  if (await submitButton.isVisible().catch(() => false)) {
    await submitButton.click();
  }

  await page.waitForTimeout(2000);
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  // Try common logout patterns

  // Check for user menu dropdown
  const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Profile"), button:has-text("Account")').first();
  if (await userMenu.isVisible().catch(() => false)) {
    await userMenu.click();
    await page.waitForTimeout(500);
  }

  // Look for logout button/link
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Log out"), a:has-text("Sign out")').first();

  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await page.waitForTimeout(2000);
  } else {
    // Fallback: navigate directly to logout or clear session
    await page.goto('/login');
  }
}

/**
 * Navigate to password reset and request reset email
 */
export async function requestPasswordReset(page: Page, email: string): Promise<void> {
  await page.goto('/forgot-password');
  await page.waitForLoadState('domcontentloaded');

  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  await emailInput.fill(email);

  // Submit form
  const submitButton = page.getByRole('button', { name: /reset|send|submit/i }).first();
  await submitButton.click();

  await page.waitForTimeout(2000);
}

/**
 * Check if user is redirected to dashboard
 */
export async function verifyDashboardAccess(page: Page): Promise<boolean> {
  await page.waitForTimeout(3000);
  const url = page.url();
  return url.includes('/dashboard');
}

/**
 * Check if user is on login page (redirected due to auth)
 */
export async function verifyLoginRedirect(page: Page): Promise<boolean> {
  await page.waitForTimeout(2000);
  const url = page.url();
  return url.includes('/login') || url.includes('/signup');
}

/**
 * Verify error message is displayed
 */
export async function verifyErrorMessage(page: Page, expectedText?: string): Promise<boolean> {
  // Look for common error indicators
  const errorSelectors = [
    '[role="alert"]',
    '.error',
    '.text-red-500',
    '.text-destructive',
    '[data-testid="error-message"]',
  ];

  for (const selector of errorSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      if (expectedText) {
        const text = await element.textContent();
        return text?.toLowerCase().includes(expectedText.toLowerCase()) ?? false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Verify success message is displayed
 */
export async function verifySuccessMessage(page: Page, expectedText?: string): Promise<boolean> {
  const successSelectors = [
    '.success',
    '.text-green-500',
    '[data-testid="success-message"]',
    '[role="status"]',
  ];

  for (const selector of successSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      if (expectedText) {
        const text = await element.textContent();
        return text?.toLowerCase().includes(expectedText.toLowerCase()) ?? false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {
    // Network idle might timeout, that's ok
  });
}

/**
 * Take a screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `test-results/screenshots/${name}-${timestamp}.png` });
}

/**
 * Get trial status from dashboard
 */
export async function getTrialStatusFromUI(page: Page): Promise<{
  isOnTrial: boolean;
  daysRemaining?: number;
}> {
  // Navigate to dashboard if not there
  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard');
    await waitForPageLoad(page);
  }

  // Look for trial indicators
  const trialBadge = page.locator('[data-testid="trial-status"], .trial-badge, :text("trial")').first();

  if (await trialBadge.isVisible().catch(() => false)) {
    const text = await trialBadge.textContent() || '';
    const daysMatch = text.match(/(\d+)\s*days?/i);
    return {
      isOnTrial: true,
      daysRemaining: daysMatch ? parseInt(daysMatch[1]) : undefined,
    };
  }

  return { isOnTrial: false };
}
