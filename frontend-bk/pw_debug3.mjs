import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.on('response', async (res) => { if (!res.ok()) console.log('BAD:', res.status(), res.request().method(), res.url()) })
await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(3000)
await browser.close()
