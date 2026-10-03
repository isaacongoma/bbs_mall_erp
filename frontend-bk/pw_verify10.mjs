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
const commentBtn = page.locator('button:has-text("Comment")').first()
if (await commentBtn.count()) { await commentBtn.click(); await page.waitForTimeout(800) }
await page.screenshot({ path: `${OUT}/toolbar-check.png` })

const btnHtml = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  const headingBtn = btns.find(b => b.innerText?.includes('Heading'))
  return headingBtn ? headingBtn.parentElement.outerHTML.slice(0, 2500) : 'no heading button; total buttons=' + btns.length
})
console.log(btnHtml)
await browser.close()
