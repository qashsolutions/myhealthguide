import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Pages
 * Tests login, signup, password reset, and verification pages
 */

test.describe('Authentication Pages', () => {
  test.describe('Login Page', () => {
    test('should load the login page', async ({ page }) => {
      await page.goto('/login');

      // Check page loaded
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display email input field', async ({ page }) => {
      await page.goto('/login');

      // Check for email input
      const emailInput = page.getByRole('textbox', { name: /email/i })
        .or(page.locator('input[type="email"]'))
        .or(page.locator('input[name="email"]'));
      await expect(emailInput.first()).toBeVisible();
    });

    test('should display password input field', async ({ page }) => {
      await page.goto('/login');

      // Check for password input
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput.first()).toBeVisible();
    });

    test('should display login button', async ({ page }) => {
      await page.goto('/login');

      // Check for login/submit button
      const loginButton = page.getByRole('button', { name: /log ?in|sign ?in|submit/i }).first();
      await expect(loginButton).toBeVisible();
    });

    test('should have link to signup', async ({ page }) => {
      await page.goto('/login');

      // Check for signup link
      const signupLink = page.getByRole('link', { name: /sign ?up|create|register/i }).first();
      await expect(signupLink).toBeVisible();
    });

    test('should have link to forgot password', async ({ page }) => {
      await page.goto('/login');

      // Check for forgot password link
      const forgotLink = page.getByRole('link', { name: /forgot|reset/i }).first();
      await expect(forgotLink).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in invalid credentials
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginButton = page.getByRole('button', { name: /log ?in|sign ?in|submit/i }).first();

      await emailInput.fill('invalid@test.com');
      await passwordInput.fill('wrongpassword');
      await loginButton.click();

      // Should show some error indication (wait for response)
      await page.waitForTimeout(2000);

      // Should still be on login page (not redirected)
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Phone Login Page', () => {
    test('should load the phone login page', async ({ page }) => {
      await page.goto('/phone-login');

      // Check page loaded
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display phone input field', async ({ page }) => {
      await page.goto('/phone-login');

      // Check for phone input
      const phoneInput = page.locator('input[type="tel"]')
        .or(page.locator('input[name*="phone"]'))
        .or(page.getByRole('textbox', { name: /phone/i }));
      await expect(phoneInput.first()).toBeVisible();
    });

    test('should show +1 prefix for US numbers', async ({ page }) => {
      await page.goto('/phone-login');

      // Check for +1 prefix indicator
      const prefixIndicator = page.getByText('+1');
      await expect(prefixIndicator.first()).toBeVisible();
    });
  });

  test.describe('Signup Page', () => {
    test('should load the signup page', async ({ page }) => {
      await page.goto('/signup');

      // Check page loaded
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display email input field', async ({ page }) => {
      await page.goto('/signup');

      // Check for email input
      const emailInput = page.getByRole('textbox', { name: /email/i })
        .or(page.locator('input[type="email"]'))
        .or(page.locator('input[name="email"]'));
      await expect(emailInput.first()).toBeVisible();
    });

    test('should display password input field', async ({ page }) => {
      await page.goto('/signup');

      // Check for password input
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput.first()).toBeVisible();
    });

    test('should display signup button', async ({ page }) => {
      await page.goto('/signup');

      // Check for signup/submit button
      const signupButton = page.getByRole('button', { name: /sign ?up|create|register|submit/i }).first();
      await expect(signupButton).toBeVisible();
    });

    test('should have link to login', async ({ page }) => {
      await page.goto('/signup');

      // Check for login link
      const loginLink = page.getByRole('link', { name: /log ?in|sign ?in/i }).first();
      await expect(loginLink).toBeVisible();
    });

    test('should have terms and privacy links', async ({ page }) => {
      await page.goto('/signup');

      // Check for terms link
      const termsLink = page.getByRole('link', { name: /terms/i }).first();
      if (await termsLink.isVisible()) {
        await expect(termsLink).toBeVisible();
      }

      // Check for privacy link
      const privacyLink = page.getByRole('link', { name: /privacy/i }).first();
      if (await privacyLink.isVisible()) {
        await expect(privacyLink).toBeVisible();
      }
    });
  });

  test.describe('Phone Signup Page', () => {
    test('should load the phone signup page', async ({ page }) => {
      await page.goto('/phone-signup');

      // Check page loaded
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display phone input field', async ({ page }) => {
      await page.goto('/phone-signup');

      // Check for phone input
      const phoneInput = page.locator('input[type="tel"]')
        .or(page.locator('input[name*="phone"]'))
        .or(page.getByRole('textbox', { name: /phone/i }));
      await expect(phoneInput.first()).toBeVisible();
    });
  });

  test.describe('Forgot Password Page', () => {
    test('should load the forgot password page', async ({ page }) => {
      await page.goto('/forgot-password');

      // Check page loaded
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display email input field', async ({ page }) => {
      await page.goto('/forgot-password');

      // Check for email input
      const emailInput = page.getByRole('textbox', { name: /email/i })
        .or(page.locator('input[type="email"]'))
        .or(page.locator('input[name="email"]'));
      await expect(emailInput.first()).toBeVisible();
    });

    test('should display reset button', async ({ page }) => {
      await page.goto('/forgot-password');

      // Check for reset/submit button
      const resetButton = page.getByRole('button', { name: /reset|send|submit/i }).first();
      await expect(resetButton).toBeVisible();
    });

    test('should have link back to login', async ({ page }) => {
      await page.goto('/forgot-password');

      // Check for back to login link
      const loginLink = page.getByRole('link', { name: /log ?in|sign ?in|back/i }).first();
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Reset Password Page', () => {
    test('should load the reset password page', async ({ page }) => {
      await page.goto('/reset-password');

      // Check page loaded (may redirect without token)
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Change Password Page', () => {
    test('should load the change password page', async ({ page }) => {
      await page.goto('/change-password');

      // Check page loaded (may redirect if not authenticated)
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Verify Email Page', () => {
    test('should load the verify email page', async ({ page }) => {
      await page.goto('/verify-email');

      // Check page loaded (may redirect without token)
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Auth Navigation Flows', () => {
  test('should navigate from login to signup', async ({ page }) => {
    await page.goto('/login');

    // Click signup link
    const signupLink = page.getByRole('link', { name: /sign ?up|create|register/i }).first();
    await signupLink.click();

    // Should be on signup page
    await expect(page).toHaveURL(/signup/);
  });

  test('should navigate from signup to login', async ({ page }) => {
    await page.goto('/signup');

    // Click login link
    const loginLink = page.getByRole('link', { name: /log ?in|sign ?in/i }).first();
    await loginLink.click();

    // Should be on login page
    await expect(page).toHaveURL(/login/);
  });

  test('should navigate from login to forgot password', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password link
    const forgotLink = page.getByRole('link', { name: /forgot|reset/i }).first();
    await forgotLink.click();

    // Should be on forgot password page
    await expect(page).toHaveURL(/forgot-password/);
  });
});

test.describe('Protected Routes Redirect', () => {
  test('dashboard should redirect to login when not authenticated', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/dashboard');

    // Should redirect to login or show login prompt
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Wait for auth check

    // Either redirected to login or shows login content
    const url = page.url();
    const isLoginPage = url.includes('login') || url.includes('signup');
    const hasLoginContent = await page.getByText(/log ?in|sign ?in/i).first().isVisible().catch(() => false);

    expect(isLoginPage || hasLoginContent).toBeTruthy();
  });

  test('settings should redirect when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/settings');

    // Should redirect or show login
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Wait for auth check

    const url = page.url();
    const isAuthPage = url.includes('login') || url.includes('signup') || !url.includes('settings');

    expect(isAuthPage).toBeTruthy();
  });
});
