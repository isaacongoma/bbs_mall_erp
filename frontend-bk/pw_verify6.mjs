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

// Inspect the toolbar's svg icons
const svgs = await page.locator('.ProseMirror ~ * svg, [class*="editor"] svg, [class*="toolbar"] svg').all()
console.log('SVG count found near editor:', svgs.length)

const html = await page.evaluate(() => {
  const btn = document.querySelector('button svg, button [class*="icon"]')
  return btn ? btn.outerHTML.slice(0, 300) : 'not found'
})
console.log('Sample icon HTML:', html)

// Find any button in a toolbar-looking row and dump its innerHTML
const toolbarHtml = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div')).filter(d => d.querySelector('svg') && d.textContent.includes('Heading'))
  return els[0] ? els[0].outerHTML.slice(0, 1500) : 'not found'
})
console.log('Toolbar HTML:', toolbarHtml)
await browser.close()
