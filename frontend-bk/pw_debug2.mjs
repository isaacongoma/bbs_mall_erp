import { chromium } from 'playwright'
const OUT = 'C:/Users/ongom/AppData/Local/Temp/claude/e--New-folder-Mindray-LabXpertServer/84068ce4-fa78-428c-b229-9282c5442c8a/scratchpad'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 250)) })
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message.slice(0, 400)))
await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 60000 })
await page.waitForTimeout(5000)
await page.screenshot({ path: `${OUT}/debug2.png` })
console.log('ERRORS:', JSON.stringify(errors.slice(0, 15), null, 2))
await browser.close()
