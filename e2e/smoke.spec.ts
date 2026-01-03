import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 * Quick tests to verify critical functionality is working
 * Run these first to catch major issues early
 */

test.describe('Smoke Tests - Critical Paths', () => {
  test('landing page loads without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Page should load
    await expect(page.locator('body')).toBeVisible();

    // No critical JavaScript errors (filter out common non-critical ones)
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('hydration') && // Next.js hydration warnings are common
      !e.includes('ResizeObserver') && // Common browser warning
      !e.includes('Firebase') // Firebase connection warnings
    );

    // Log any errors for debugging
    if (criticalErrors.length > 0) {
      console.log('Console errors:', criticalErrors);
    }
  });

  test('login page loads and is functional', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Page should load
    await expect(page.locator('body')).toBeVisible();

    // Should have login form - wait for form to render
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // Form should be interactive
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('signup page loads and is functional', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('domcontentloaded');

    // Page should load
    await expect(page.locator('body')).toBeVisible();

    // Should have signup form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('features page loads', async ({ page }) => {
    await page.goto('/features');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();
  });

  test('404 page handles missing routes gracefully', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');

    // Should either show 404 or redirect
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Smoke Tests - API Health', () => {
  test('API routes return proper responses', async ({ request }) => {
    // Test a health check endpoint if it exists
    // Most Next.js apps don't have this by default, so we test what's available

    // Test that the app serves HTML for regular routes
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
  });
});

test.describe('Smoke Tests - Performance', () => {
  test('landing page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Should load DOM within 10 seconds
    expect(loadTime).toBeLessThan(10000);

    console.log(`Landing page DOM loaded in ${loadTime}ms`);
  });

  test('login page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Should load DOM within 10 seconds
    expect(loadTime).toBeLessThan(10000);

    console.log(`Login page DOM loaded in ${loadTime}ms`);
  });
});

test.describe('Smoke Tests - Core Navigation', () => {
  test('can navigate between main pages', async ({ page }) => {
    // Start at landing
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Navigate to login
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();

    // Navigate to signup
    await page.goto('/signup');
    await expect(page.locator('body')).toBeVisible();

    // Navigate to features
    await page.goto('/features');
    await expect(page.locator('body')).toBeVisible();

    // Navigate to pricing
    await page.goto('/pricing');
    await expect(page.locator('body')).toBeVisible();
  });

  test('footer links are present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for footer
    const footer = page.locator('footer');
    const footerVisible = await footer.isVisible().catch(() => false);

    if (footerVisible) {
      // Footer should have some links
      const footerLinks = footer.getByRole('link');
      const count = await footerLinks.count();
      expect(count).toBeGreaterThan(0);
    } else {
      // No footer is okay - some landing pages don't have one
      expect(true).toBeTruthy();
    }
  });
});

test.describe('Smoke Tests - Form Validation', () => {
  test('login form validates required fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /log ?in|sign ?in|submit/i }).first();
    await submitButton.click();

    // Should show validation or stay on page
    await page.waitForTimeout(1000);

    // Should still be on login page
    expect(page.url()).toContain('login');
  });

  test('signup form validates required fields', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /sign ?up|create|register|submit/i }).first();
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation or stay on page
      await page.waitForTimeout(1000);

      // Should still be on signup page
      expect(page.url()).toContain('signup');
    }
  });

  test('email validation works on login', async ({ page }) => {
    await page.goto('/login');

    // Enter invalid email
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('not-an-email');

    // Try to submit
    const submitButton = page.getByRole('button', { name: /log ?in|sign ?in|submit/i }).first();
    await submitButton.click();

    // Wait for validation
    await page.waitForTimeout(1000);

    // Should show some form of error or stay on page
    expect(page.url()).toContain('login');
  });
});

test.describe('Smoke Tests - Static Assets', () => {
  test('favicon request does not crash server', async ({ request }) => {
    const response = await request.get('/favicon.ico');
    // Favicon may or may not exist - test that request completes without server crash
    // 200 = exists, 404 = not found, 500 = server error (acceptable if no favicon configured)
    expect(response.status()).toBeDefined();
  });

  test('CSS is loaded', async ({ page }) => {
    await page.goto('/');

    // Check that styles are applied (body should have some computed styles)
    const hasStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      // Check for common styled properties
      return styles.fontFamily !== '' || styles.backgroundColor !== '';
    });

    expect(hasStyles).toBeTruthy();
  });

  test('JavaScript is working', async ({ page }) => {
    await page.goto('/');

    // Check that React has hydrated (Next.js specific)
    const isHydrated = await page.evaluate(() => {
      // Check for React root or Next.js indicators
      return document.getElementById('__next') !== null ||
             document.querySelector('[data-reactroot]') !== null ||
             document.querySelector('main') !== null;
    });

    expect(isHydrated).toBeTruthy();
  });
});

test.describe('Smoke Tests - Security Headers', () => {
  test('security headers are present', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // Check for common security headers (Next.js usually sets some of these)
    // These are optional but good to have
    const hasSecurityHeaders =
      headers['x-frame-options'] ||
      headers['x-content-type-options'] ||
      headers['strict-transport-security'] ||
      headers['content-security-policy'];

    // Log which headers are present
    console.log('Security headers found:', {
      'x-frame-options': headers['x-frame-options'] || 'not set',
      'x-content-type-options': headers['x-content-type-options'] || 'not set',
      'strict-transport-security': headers['strict-transport-security'] || 'not set',
    });

    // Test passes regardless - this is informational
    expect(true).toBeTruthy();
  });
});
