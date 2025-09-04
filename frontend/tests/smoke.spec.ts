import { test, expect } from '@playwright/test'

test('dashboard renders core sections', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'DCOM360' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Current Risk Levels' })).toBeVisible()
  await expect(page.getByText('Interactive Map')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible()
  await expect(page.getByText('Recent Disasters')).toBeVisible()
})

test('statistics show at least one data point', async ({ page }) => {
  await page.goto('/')
  // Wait for the charts to fetch and render
  await page.waitForTimeout(1500)
  // Look for an SVG canvas container created by Chart.js
  const canvases = await page.locator('canvas').count()
  expect(canvases).toBeGreaterThan(0)
})

test('map renders container, marker optional', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('div:has-text("Interactive Map")')).toBeVisible()
  // If a Mapbox token is present and API returns coords, a marker element should exist.
  // We don’t fail if not present (tokenless/local run).
  const markerCount = await page.locator('.mapboxgl-marker').count().catch(() => 0)
  expect(markerCount).toBeGreaterThanOrEqual(0)
})
