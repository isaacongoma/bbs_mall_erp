import { chromium } from 'playwright'
const OUT = 'C:/Users/ongom/AppData/Local/Temp/claude/e--New-folder-Mindray-LabXpertServer/84068ce4-fa78-428c-b229-9282c5442c8a/scratchpad'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 20000 })
await page.waitForTimeout(1500)
await page.locator('input[type="email"]').first().fill('admin@bbs-erp.local')
await page.locator('input[type="password"]').first().fill('admin12345')
await page.locator('button:has-text("Sign in")').first().click()
await page.waitForTimeout(3000)
await page.goto('http://localhost:8080/crm/leads/CRM-LEAD-2026-00007#comments', { waitUntil: 'load', timeout: 20000 })
await page.waitForTimeout(2000)
// footer toggle, bottom of page
await page.locator('footer button:has-text("Comment"), div:below(:text("Reply")) >> text=Comment').first().click({ timeout: 5000 }).catch(async () => {
  // fallback: click by approximate position (bottom-left footer area)
  await page.mouse.click(400, 975)
})
await page.waitForTimeout(1000)
await page.screenshot({ path: `${OUT}/toolbar-check2.png`, clip: { x: 250, y: 850, width: 1200, height: 150 } })
await browser.close()
