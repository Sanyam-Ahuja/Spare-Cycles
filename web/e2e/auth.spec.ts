import { test, expect } from '@playwright/test';

test.describe('Marketing & Auth Navigation', () => {
  test('landing page renders correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check main value prop
    await expect(page.getByText(/idle compute, put to work/i)).toBeVisible();
    
    // Check call to actions
    await expect(page.getByRole('link', { name: /Submit a job/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Try the sample scene/i }).first()).toBeVisible();
  });

  test('pricing page renders correctly', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.getByText(/Pay for the compute you use/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /CPU compute/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /GPU compute/i })).toBeVisible();
  });

  test('login page has continue with google', async ({ page }) => {
    await page.goto('/login');
    
    // We expect the Continue with Google button
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });
});
