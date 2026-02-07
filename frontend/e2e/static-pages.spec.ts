import { test, expect } from '@playwright/test'

test.describe('Static Pages', () => {
  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page).toHaveTitle(/Gerege SSO/)
    await expect(page.locator('main')).toBeVisible()
  })

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms')
    await expect(page).toHaveTitle(/Gerege SSO/)
    await expect(page.locator('main')).toBeVisible()
  })

  test('docs page loads', async ({ page }) => {
    await page.goto('/docs')
    await expect(page).toHaveTitle(/Gerege SSO/)
  })

  test('data-deletion page loads', async ({ page }) => {
    await page.goto('/data-deletion')
    await expect(page).toHaveTitle(/Gerege SSO/)
    await expect(page.locator('main')).toBeVisible()
  })

  test('developers page loads', async ({ page }) => {
    await page.goto('/developers')
    await expect(page).toHaveTitle(/Gerege SSO/)
  })
})
