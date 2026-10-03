import { chromium } from 'playwright'

const OUT = 'C:/Users/ongom/AppData/Local/Temp/claude/e--New-folder-Mindray-LabXpertServer/84068ce4-fa78-428c-b229-9282c5442c8a/scratchpad'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 250)) })
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message.slice(0, 350)))

await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 60000 })
await page.waitForTimeout(1500)
await page.locator('input[type="email"]').first().fill('admin@bbs-erp.local')
await page.locator('input[type="password"]').first().fill('admin12345')
await page.locator('button:has-text("Sign in")').first().click()
await page.waitForTimeout(4000)

console.log('URL:', page.url())
await page.screenshot({ path: `${OUT}/our-sidebar.png` })
console.log('ERRORS (first 20):', JSON.stringify(errors.slice(0, 20), null, 2))
await browser.close()
