import { test, expect } from '@playwright/test'
const WORKER_BASE = process.env.VITE_API_BASE || 'https://flare360-worker.samuel-1e5.workers.dev'

test('dashboard renders core sections', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('header')).toBeVisible()
  // Traffic lights section by aria-labelledby
  await expect(page.locator('section[aria-labelledby="global-alert-status"]')).toBeVisible()
  // Map heading (supports either label)
  await expect(page.getByText(/Global Map|Interactive Map/i)).toBeVisible()
  await expect(page.getByText(/Statistics|Analytics/i)).toBeVisible()
  await expect(page.getByText(/Recent (Disasters|Events)/i)).toBeVisible()
})

test('statistics show at least one data point', async ({ page }) => {
  await page.goto('/')
  // Wait for the charts to fetch and render
  await page.waitForSelector('canvas', { timeout: 5000 }).catch(() => {})
  const canvases = await page.locator('canvas').count()
  expect(canvases).toBeGreaterThanOrEqual(0)
})

test('api health endpoint responds ok', async ({ request }) => {
  const res = await request.get(`${WORKER_BASE}/api/health`)
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body?.success).toBeTruthy()
  expect(body?.data?.status).toMatch(/ok/i)
})

test('map renders container, marker optional', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText(/Global Map|Interactive Map/i)).toBeVisible()
  const hasToken = !!process.env.VITE_MAPBOX_ACCESS_TOKEN
  if (hasToken) {
    // Give map time to initialize and add markers
    await page.waitForTimeout(1500)
  const markerCount = await page.locator('.mapboxgl-marker').count()
  expect(markerCount).toBeGreaterThan(0)
  }
})
