import { chromium } from 'playwright'
const OUT = 'C:/Users/ongom/AppData/Local/Temp/claude/e--New-folder-Mindray-LabXpertServer/84068ce4-fa78-428c-b229-9282c5442c8a/scratchpad'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message.slice(0, 200)))
page.on('response', async (res) => {
  if (!res.ok() && !res.url().includes('telemetry') && !res.url().includes('onboarding') && !res.url().includes('session/users')) {
    console.log('BAD:', res.status(), res.request().method(), res.url())
  }
})

await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 20000 })
await page.waitForTimeout(1500)
await page.locator('input[type="email"]').first().fill('admin@bbs-erp.local')
await page.locator('input[type="password"]').first().fill('admin12345')
await page.locator('button:has-text("Sign in")').first().click()
await page.waitForTimeout(3000)

await page.goto('http://localhost:8080/crm/leads/CRM-LEAD-2026-00007', { waitUntil: 'load', timeout: 20000 })
await page.waitForTimeout(3000)
console.log('URL:', page.url())
await page.screenshot({ path: `${OUT}/lead-activity.png` })

// Comments tab
await page.locator('text=Comments').first().click()
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/lead-comments.png` })

// Data tab
await page.locator('text=Data').first().click()
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/lead-data.png` })

console.log('ERRORS (non-benign):', JSON.stringify(errors.filter(e => !e.includes('telemetry') && !e.includes('onboarding')).slice(0,10), null, 2))
await browser.close()
