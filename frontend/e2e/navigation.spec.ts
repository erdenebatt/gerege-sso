import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('can navigate from home to privacy page', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: /Privacy|Нууцлал/ })
      .click()
    await expect(page).toHaveURL(/\/privacy/)
  })

  test('can navigate from home to terms page', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: /Terms|Үйлчилгээний/ })
      .click()
    await expect(page).toHaveURL(/\/terms/)
  })

  test('can navigate from home to docs page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: /API/ }).click()
    await expect(page).toHaveURL(/\/docs/)
  })

  test('page title contains Gerege SSO', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Gerege SSO/)
  })
})
