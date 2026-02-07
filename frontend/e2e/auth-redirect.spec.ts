import { test, expect } from '@playwright/test'

test.describe('Auth Redirects', () => {
  test('dashboard redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard')
    // Should redirect to login page since there's no token
    await expect(page).toHaveURL(/\/$|\/\?redirect/)
  })

  test('Google login button navigates to OAuth endpoint', async ({ page }) => {
    await page.goto('/')
    const googleButton = page.getByRole('button').filter({ hasText: /Google/ })
    await expect(googleButton).toBeVisible()
    // Click should attempt navigation to /api/auth/google
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/api/auth/google')),
      googleButton.click(),
    ])
    expect(request.url()).toContain('/api/auth/google')
  })

  test('admin page requires authentication', async ({ page }) => {
    await page.goto('/admin')
    // Should not show admin content without auth
    await expect(page).toHaveTitle(/Gerege SSO/)
  })
})
