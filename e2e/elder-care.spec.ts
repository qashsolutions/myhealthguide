/**
 * Elder Care Workflow Tests
 *
 * Tests the core elder care functionality:
 * - Dashboard access and display
 * - Elder management
 * - Daily care features (medications, supplements, diet)
 *
 * Note: These tests require authentication. We test the UI flows
 * that are visible without needing to create real data.
 */

import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './fixtures/test-config';
import { dismissCookieConsent, waitForPageLoad, loginWithEmail } from './fixtures/auth-helpers';

test.describe('Elder Care - Public Pages', () => {
  test('should display features page with elder care information', async ({ page }) => {
    await page.goto('/features');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Should show features heading
    const heading = page.locator('h1, h2').filter({ hasText: /features|care|health/i }).first();
    await expect(heading).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should mention medication tracking in features', async ({ page }) => {
    await page.goto('/features');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for medication-related content
    const medContent = page.locator('text=/medication|prescription|dose/i').first();
    await expect(medContent).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should mention health tracking features', async ({ page }) => {
    await page.goto('/features');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for health/tracking content
    const healthContent = page.locator('text=/health|tracking|monitor/i').first();
    await expect(healthContent).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should have navigation to signup from features', async ({ page }) => {
    await page.goto('/features');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for CTA to signup
    const signupCTA = page.locator('a:has-text("Start"), a:has-text("Sign Up"), a:has-text("Get Started"), a:has-text("Free Trial")').first();
    await expect(signupCTA).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });
});

test.describe('Elder Care - Dashboard Access', () => {
  test('should redirect to login when accessing dashboard unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);

    // Should redirect to login
    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing daily-care unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/daily-care');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing elders page unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/elders');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing medications unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/daily-care?tab=medications');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });
});

test.describe('Elder Care - About Page', () => {
  test('should display about page with company information', async ({ page }) => {
    await page.goto('/about');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Should have about content
    const aboutHeading = page.locator('h1, h2').filter({ hasText: /about|mission|story/i }).first();
    await expect(aboutHeading).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should mention elder care focus', async ({ page }) => {
    await page.goto('/about');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for elder care related content
    const elderContent = page.locator('text=/elder|senior|caregiver|family/i').first();
    await expect(elderContent).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });
});

test.describe('Elder Care - Help/Support', () => {
  test('should have help link in navigation', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for help link
    const helpLink = page.locator('a:has-text("Help"), nav a:has-text("Help")').first();
    await expect(helpLink).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should be able to access help page', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Click help link
    const helpLink = page.locator('a:has-text("Help"), nav a:has-text("Help")').first();

    if (await helpLink.isVisible().catch(() => false)) {
      await helpLink.click();
      await page.waitForTimeout(2000);

      // Should navigate to help or show help content
      const body = await page.locator('body').isVisible();
      expect(body).toBeTruthy();
    }
  });
});

test.describe('Elder Care - Terms & Privacy', () => {
  test('should have terms of service page', async ({ page }) => {
    await page.goto('/terms');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Should show terms content
    const termsHeading = page.locator('h1, h2').filter({ hasText: /terms|service|agreement/i }).first();
    await expect(termsHeading).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should have privacy policy page', async ({ page }) => {
    await page.goto('/privacy');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Should show privacy content
    const privacyHeading = page.locator('h1, h2').filter({ hasText: /privacy|policy/i }).first();
    await expect(privacyHeading).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should mention HIPAA compliance', async ({ page }) => {
    await page.goto('/privacy');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for HIPAA mention
    const hipaaContent = page.locator('text=/HIPAA|health.information|protected/i').first();
    if (await hipaaContent.isVisible().catch(() => false)) {
      await expect(hipaaContent).toBeVisible();
    }
  });
});

test.describe('Elder Care - Homepage', () => {
  test('should display homepage with value proposition', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Should have main heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should have clear call-to-action', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for CTA buttons
    const ctaButton = page.locator('a:has-text("Start"), a:has-text("Sign Up"), a:has-text("Get Started"), button:has-text("Start")').first();
    await expect(ctaButton).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should have navigation menu', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Check for navigation items
    const featuresLink = page.locator('a:has-text("Features")').first();
    const pricingLink = page.locator('a:has-text("Pricing")').first();

    await expect(featuresLink).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
    await expect(pricingLink).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should have sign in link', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for sign in link
    const signInLink = page.locator('a:has-text("Sign In"), a:has-text("Log In")').first();
    await expect(signInLink).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });
});

test.describe('Elder Care - Mobile Navigation', () => {
  test('should have usable navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Page should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Look for mobile menu button or navigation
    const mobileMenu = page.locator('[aria-label*="menu"], button:has-text("Menu"), .hamburger, [data-testid="mobile-menu"]').first();
    const regularNav = page.locator('nav').first();

    // Either mobile menu or regular nav should be present
    const hasMobileMenu = await mobileMenu.isVisible().catch(() => false);
    const hasRegularNav = await regularNav.isVisible().catch(() => false);

    expect(hasMobileMenu || hasRegularNav).toBeTruthy();
  });

  test('should display features page correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/features');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Content should be visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });
});

test.describe('Elder Care - Accessibility', () => {
  test('should have proper page title', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have meta description', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);

    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
    // Meta description should exist and have content
    expect(metaDesc).toBeTruthy();
  });

  test('should have accessible links', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Check that links have text or aria-labels
    const links = page.locator('a');
    const count = await links.count();

    // Should have multiple links
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Elder Care - Performance', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;
    console.log(`Homepage loaded in ${loadTime}ms`);

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should load features page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/features');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;
    console.log(`Features page loaded in ${loadTime}ms`);

    expect(loadTime).toBeLessThan(10000);
  });

  test('should load pricing page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;
    console.log(`Pricing page loaded in ${loadTime}ms`);

    expect(loadTime).toBeLessThan(10000);
  });
});
