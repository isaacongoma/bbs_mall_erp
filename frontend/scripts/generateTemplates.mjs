import fs from 'node:fs'
import path from 'node:path'

const sources = [
  { app: 'frappe', root: '../vendor/frappe/frappe/public/js/frappe' },
  { app: 'erpnext', root: '../vendor/erpnext/erpnext/public/js' },
  { app: 'hrms', root: '../vendor/hrms/hrms/public/js', extra: ['../vendor/hrms/hrms/hr/page'] },
]

function walk(directory, result = []) {
  if (!fs.existsSync(directory)) return result
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(full, result)
    else if (entry.name.endsWith('.html')) result.push(full)
  }
  return result
}

for (const { app, root, extra = [] } of sources) {
  const entries = {}
  for (const file of [root, ...extra].flatMap((directory) => walk(path.resolve(directory)))) {
    entries[path.basename(file, '.html')] = fs.readFileSync(file, 'utf8')
  }
  const output = path.resolve(`src/shared/frappe/upstream/templates/${app}.ts`)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  const body = `const templates: Record<string, string> = ${JSON.stringify(entries, null, 2)}\n\nexport default templates\n`
  fs.writeFileSync(output, body, 'utf8')
  console.log(`${app}: ${Object.keys(entries).length} templates`)
}
