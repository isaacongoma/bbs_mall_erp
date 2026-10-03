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

// click the top user/brand area to open the dropdown
await page.locator('text=CRM').first().click()
await page.waitForTimeout(1000)
await page.screenshot({ path: `${OUT}/user-dropdown.png` })
await browser.close()
