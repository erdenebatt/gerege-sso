import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Gerege SSO/)
  })

  test('should display the logo and title', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByAltText('Gerege SSO')).toBeVisible()
  })

  test('should display OAuth login buttons', async ({ page }) => {
    await page.goto('/')
    // The buttons contain text in either Mongolian or English
    await expect(page.getByRole('button').filter({ hasText: /Google/ })).toBeVisible()
    await expect(page.getByRole('button').filter({ hasText: /Apple/ })).toBeVisible()
    await expect(page.getByRole('button').filter({ hasText: /Facebook/ })).toBeVisible()
    await expect(page.getByRole('button').filter({ hasText: /X/ })).toBeVisible()
  })

  test('should display footer links', async ({ page }) => {
    await page.goto('/')
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('link', { name: /Privacy|Нууцлал/ })).toBeVisible()
    await expect(footer.getByRole('link', { name: /Terms|Үйлчилгээний/ })).toBeVisible()
    await expect(footer.getByRole('link', { name: /API/ })).toBeVisible()
  })
})
