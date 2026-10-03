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

const lucideEls = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('[class*="lucide-"]'))
  return els.slice(0, 5).map(el => {
    const cs = getComputedStyle(el)
    return {
      class: el.className,
      tag: el.tagName,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      maskImage: cs.maskImage || cs.webkitMaskImage,
      width: cs.width,
      height: cs.height,
      display: cs.display,
    }
  })
})
console.log(JSON.stringify(lucideEls, null, 2))
await browser.close()
