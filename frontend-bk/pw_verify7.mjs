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

const info = await page.evaluate(() => {
  const headingBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Heading')
  if (!headingBtn) return 'Heading button not found'
  const parent = headingBtn.closest('div')
  const iconEls = parent?.parentElement ? Array.from(parent.parentElement.querySelectorAll('span,svg,i')).slice(0,10) : []
  return {
    parentHtml: parent?.parentElement?.outerHTML?.slice(0, 2000),
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
