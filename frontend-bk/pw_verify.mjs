import { chromium } from 'playwright'
const OUT = 'C:/Users/ongom/AppData/Local/Temp/claude/e--New-folder-Mindray-LabXpertServer/84068ce4-fa78-428c-b229-9282c5442c8a/scratchpad'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 200)) })
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message.slice(0, 300)))

await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(1500)
await page.locator('input[type="email"]').first().fill('admin@bbs-erp.local')
await page.locator('input[type="password"]').first().fill('admin12345')
await page.locator('button:has-text("Sign in")').first().click()
await page.waitForTimeout(3000)
console.log('URL after login:', page.url())
await page.screenshot({ path: `${OUT}/v1-home.png` })

// Navigate to leads and open a lead detail
await page.goto('http://localhost:8080/crm/leads', { waitUntil: 'load', timeout: 20000 })
await page.waitForTimeout(2000)
const firstLeadLink = page.locator('a, [role="link"], .cursor-pointer').filter({ hasText: /./ }).first()
const rows = page.locator('div[class*="row"]')
// click first lead name cell text
const leadCell = page.getByText(/./).first()
await page.waitForTimeout(500)

// find a row link by looking for the list rows container
const anyRow = page.locator('text=/.+/').first()
await page.screenshot({ path: `${OUT}/v2-leads-list.png` })

await browser.close()
