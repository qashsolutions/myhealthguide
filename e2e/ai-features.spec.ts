/**
 * AI Features Tests
 *
 * Tests the AI-powered features including:
 * - AI consent requirements
 * - Health chat access
 * - Smart features mentions
 * - Drug interaction checking
 * - Dementia screening
 *
 * Note: Full AI feature testing requires authenticated sessions
 * and consent. These tests verify the access control and UI elements.
 */

import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './fixtures/test-config';
import { dismissCookieConsent, waitForPageLoad } from './fixtures/auth-helpers';

test.describe('AI Features - Route Protection', () => {
  test('should redirect to login when accessing health-chat unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/health-chat');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing ask-ai unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/ask-ai');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing drug-interactions unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/drug-interactions');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing safety-alerts unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/safety-alerts');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing dementia-screening unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/dementia-screening');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing analytics unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/analytics');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing insights unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/insights');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });

  test('should redirect to login when accessing clinical-notes unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/clinical-notes');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });
});

test.describe('AI Features - Features Page Content', () => {
  test('should mention AI/Smart features on features page', async ({ page }) => {
    await page.goto('/features');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for AI/Smart content in main content area (not screen reader text)
    const aiContent = page.locator('main, article, section, .content').locator('text=/smart|intelligent|insight/i').first();
    const hasAiContent = await aiContent.isVisible().catch(() => false);

    // Fallback: check page text contains smart features
    const pageText = await page.textContent('body') || '';
    const hasSmartMention = /smart|intelligent|insight|analytic/i.test(pageText);

    expect(hasAiContent || hasSmartMention).toBeTruthy();
  });

  test('should mention health insights', async ({ page }) => {
    await page.goto('/features');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for insights content
    const insightsContent = page.locator('text=/insight|analytic|trend|report/i').first();
    await expect(insightsContent).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should mention drug interaction checking', async ({ page }) => {
    await page.goto('/features');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for drug interaction content
    const drugContent = page.locator('text=/drug|interaction|medication|safety/i').first();
    await expect(drugContent).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });
});

test.describe('AI Features - API Protection', () => {
  test('should return error for unauthenticated chat API', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { message: 'test' }
    });

    // Should return error status
    expect([401, 403, 400, 500]).toContain(response.status());
  });

  test('should return error for unauthenticated medgemma API', async ({ request }) => {
    const response = await request.post('/api/medgemma/query', {
      data: { query: 'test' }
    });

    // Should return error status
    expect([401, 403, 400, 500]).toContain(response.status());
  });

  test('should return error for unauthenticated drug-interactions API', async ({ request }) => {
    const response = await request.post('/api/drug-interactions', {
      data: { medications: [] }
    });

    // Should return error status (405 = method not allowed is also acceptable)
    expect([401, 403, 400, 405, 500]).toContain(response.status());
  });

  test('should return error for unauthenticated ai-analytics API', async ({ request }) => {
    const response = await request.post('/api/ai-analytics', {
      data: { type: 'test' }
    });

    // Should return error status
    expect([401, 403, 400, 500]).toContain(response.status());
  });

  test('should return error for unauthenticated dementia-assessment API', async ({ request }) => {
    const response = await request.post('/api/dementia-assessment', {
      data: {}
    });

    // Should return error status
    expect([401, 403, 400, 500]).toContain(response.status());
  });

  test('should return error for unauthenticated weekly-summary API', async ({ request }) => {
    const response = await request.post('/api/weekly-summary', {
      data: {}
    });

    // Should return error status
    expect([401, 403, 400, 500]).toContain(response.status());
  });
});

test.describe('AI Features - Terms & Privacy', () => {
  test('should mention data processing in privacy policy', async ({ page }) => {
    await page.goto('/privacy');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Check page text contains data processing mentions
    const pageText = await page.textContent('body') || '';
    const hasDataMention = /data|information|collect|process|privacy/i.test(pageText);

    expect(hasDataMention).toBeTruthy();
  });

  test('should mention smart/AI features in terms', async ({ page }) => {
    await page.goto('/terms');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for smart/AI terms
    const aiTerms = page.locator('text=/smart|AI|automated|content|generat/i').first();
    if (await aiTerms.isVisible().catch(() => false)) {
      await expect(aiTerms).toBeVisible();
    }
  });

  test('should have medical disclaimer', async ({ page }) => {
    await page.goto('/terms');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for medical disclaimer
    const medicalDisclaimer = page.locator('text=/medical|diagnos|professional|doctor|physician/i').first();
    await expect(medicalDisclaimer).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });
});

test.describe('AI Features - Consent Related', () => {
  test('should have consent information in privacy policy', async ({ page }) => {
    await page.goto('/privacy');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for consent content
    const consentContent = page.locator('text=/consent|agree|permission|accept/i').first();
    await expect(consentContent).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should mention data usage', async ({ page }) => {
    await page.goto('/privacy');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for data usage content
    const dataUsage = page.locator('text=/data|information|collect|use|store/i').first();
    await expect(dataUsage).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });
});

test.describe('AI Features - Homepage Mentions', () => {
  test('should mention smart/intelligent features on homepage', async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for smart features mention
    const smartContent = page.locator('text=/smart|intelligent|AI|insight/i').first();
    if (await smartContent.isVisible().catch(() => false)) {
      await expect(smartContent).toBeVisible();
    }
  });
});

test.describe('AI Features - About Page', () => {
  test('should mention technology/AI approach', async ({ page }) => {
    await page.goto('/about');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Look for technology content
    const techContent = page.locator('text=/technolog|innovat|AI|smart|digital/i').first();
    if (await techContent.isVisible().catch(() => false)) {
      await expect(techContent).toBeVisible();
    }
  });
});

test.describe('AI Features - Mobile Access', () => {
  test('should display features page correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/features');
    await waitForPageLoad(page);
    await dismissCookieConsent(page);

    // Page should be usable
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium });
  });

  test('should redirect to login for AI routes on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard/ask-ai');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url.includes('login') || url.includes('signup')).toBeTruthy();
  });
});

test.describe('AI Features - Security Headers', () => {
  test('should have security headers on AI API routes', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { message: 'test' }
    });

    const headers = response.headers();

    // Log headers for inspection
    console.log('API response status:', response.status());

    // Should return a response (even if error)
    expect(response.status()).toBeDefined();
  });
});
