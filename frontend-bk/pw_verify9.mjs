import { chromium } from 'playwright'
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
if (await commentBtn.count()) { await commentBtn.click(); await page.waitForTimeout(500) }

const result = await page.evaluate(() => {
  // Find the row containing the "Heading" label (fixed menu)
  const headingSpan = Array.from(document.querySelectorAll('*')).find(el => el.children.length === 0 && el.textContent.trim() === 'Heading')
  if (!headingSpan) return { error: 'no Heading text node found' }
  let row = headingSpan
  for (let i = 0; i < 5 && row; i++) {
    if (row.querySelectorAll('svg, [class*="icon"]').length > 3) break
    row = row.parentElement
  }
  if (!row) return { error: 'no row found' }
  const buttons = Array.from(row.querySelectorAll('button')).slice(0, 6)
  return buttons.map(b => ({
    outerHTMLStart: b.outerHTML.slice(0, 400),
  }))
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
