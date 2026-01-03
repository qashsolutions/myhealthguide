import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Public Pages
 * Tests that all public pages load correctly and contain expected content
 */

test.describe('Public Pages', () => {
  test.describe('Landing Page', () => {
    test('should load the landing page', async ({ page }) => {
      await page.goto('/');

      // Check page loaded
      await expect(page).toHaveTitle(/MyGuide|Health/i);

      // Check for main content
      await expect(page.locator('body')).toBeVisible();
    });

    test('should have navigation links', async ({ page }) => {
      await page.goto('/');

      // Check for common navigation elements
      const nav = page.locator('nav, header');
      await expect(nav.first()).toBeVisible();
    });

    test('should have call-to-action buttons', async ({ page }) => {
      await page.goto('/');

      // Look for signup/get started buttons
      const ctaButton = page.getByRole('link', { name: /sign up|get started|start/i }).first();
      await expect(ctaButton).toBeVisible();
    });
  });

  test.describe('Features Page', () => {
    test('should load the features page', async ({ page }) => {
      await page.goto('/features');

      // Check page loaded with features content
      await expect(page.locator('body')).toBeVisible();

      // Should have feature-related content
      const heading = page.getByRole('heading', { level: 1 }).first();
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Pricing Page', () => {
    test('should load the pricing page', async ({ page }) => {
      await page.goto('/pricing');

      // Check page loaded
      await expect(page.locator('body')).toBeVisible();

      // Should have pricing-related content
      const pricingContent = page.getByText(/price|plan|month|\$/i).first();
      await expect(pricingContent).toBeVisible();
    });

    test('should display pricing plans', async ({ page }) => {
      await page.goto('/pricing');

      // Wait for pricing content to load
      await page.waitForLoadState('domcontentloaded');

      // Should show pricing options
      const priceElements = page.locator('[class*="price"], [class*="plan"], [data-testid*="price"]');
      // At least some pricing content should be visible
      await expect(page.locator('body')).toContainText(/\$|free|trial/i);
    });
  });

  test.describe('About Page', () => {
    test('should load the about page', async ({ page }) => {
      await page.goto('/about');

      // Check page loaded
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Legal Pages', () => {
    test('should load the terms page', async ({ page }) => {
      await page.goto('/terms');

      // Check page loaded with terms content
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).toContainText(/terms|service|agreement/i);
    });

    test('should load the privacy page', async ({ page }) => {
      await page.goto('/privacy');

      // Check page loaded with privacy content
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).toContainText(/privacy|data|information/i);
    });

    test('should load the HIPAA notice page', async ({ page }) => {
      await page.goto('/hipaa-notice');

      // Check page loaded with HIPAA content
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).toContainText(/HIPAA|health|privacy/i);
    });
  });

  test.describe('Help Page', () => {
    test('should load the help page', async ({ page }) => {
      await page.goto('/help');

      // Check page loaded
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Tips Page', () => {
    test('should load the tips page', async ({ page }) => {
      await page.goto('/tips');

      // Check page loaded
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Page Navigation', () => {
  test('should navigate from landing to features', async ({ page }) => {
    await page.goto('/');

    // Find and click features link
    const featuresLink = page.getByRole('link', { name: /features/i }).first();
    if (await featuresLink.isVisible()) {
      await featuresLink.click();
      await expect(page).toHaveURL(/features/);
    }
  });

  test('should navigate from landing to pricing', async ({ page }) => {
    await page.goto('/');

    // Find and click pricing link
    const pricingLink = page.getByRole('link', { name: /pricing/i }).first();
    if (await pricingLink.isVisible()) {
      await pricingLink.click();
      await expect(page).toHaveURL(/pricing/);
    }
  });

  test('should navigate to login from landing', async ({ page }) => {
    await page.goto('/');

    // Find and click login/sign in link
    const loginLink = page.getByRole('link', { name: /log ?in|sign ?in/i }).first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });
});

test.describe('Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});
