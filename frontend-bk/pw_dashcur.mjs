import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://localhost:8080/');
await page.waitForTimeout(1000);
const emailInput = page.locator('input[type="email"]').first();
if (await emailInput.count()) {
  await emailInput.fill('admin@bbs-erp.local');
  await page.locator('input[type="password"]').first().fill('admin12345');
  await page.getByRole('button', { name: /login|sign in/i }).first().click();
  await page.waitForTimeout(2000);
}

await page.goto('http://localhost:8080/crm/call-logs');
await page.waitForTimeout(1500);
const userDropdownBtn = page.locator('div.text-base-medium', { hasText: 'CRM' }).first();
await userDropdownBtn.click();
await page.waitForTimeout(500);
await page.locator('text=Settings').first().click();
await page.waitForTimeout(800);
const dialog = page.locator('[role="dialog"], .dialog-content').first();
await dialog.getByText('Dashboard', { exact: true }).first().click({ force: true });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'C:/Users/ongom/AppData/Local/Temp/claude/e--New-folder-Mindray-LabXpertServer/84068ce4-fa78-428c-b229-9282c5442c8a/scratchpad/dashboard_currency.png' });

console.log('done');
await browser.close();
