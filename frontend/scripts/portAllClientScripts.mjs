import fs from 'node:fs'
import path from 'node:path'
import { portClientScript } from './portClientScript.mjs'

const [app, kind = 'doctype', ...only] = process.argv.slice(2)
const root = path.resolve(`../vendor/${app}/${app}`)
const target = path.resolve(`src/modules/${app}`)

function walk(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'public' && kind === 'doctype') continue
      walk(full, result)
    } else if (entry.name.endsWith('.js') && !entry.name.startsWith('test_') && !entry.name.endsWith('.bundle.js')) result.push(full)
  }
  return result
}

const files = walk(root).filter((file) => file.split(path.sep).includes(kind)).filter((file) => !only.length || only.some((name) => file.includes(name)))
const summary = { ok: 0, failed: [], unknown: {} }
for (const file of files) {
  const relative = path.relative(root, file)
  const output = path.join(target, relative.replace(/\.js$/, '.ts'))
  try {
    const { code, unknown } = await portClientScript(file)
    fs.mkdirSync(path.dirname(output), { recursive: true })
    fs.writeFileSync(output, code, 'utf8')
    summary.ok += 1
    for (const name of unknown) summary.unknown[name] = (summary.unknown[name] ?? 0) + 1
  } catch (error) {
    summary.failed.push(`${relative}: ${String(error).split('\n')[0]}`)
  }
}
console.log(`ported ${summary.ok} of ${files.length}`)
if (summary.failed.length) console.log('failed:\n' + summary.failed.join('\n'))
const names = Object.entries(summary.unknown).sort((a, b) => b[1] - a[1])
console.log('free names not provided by the runtime:\n' + names.map(([name, count]) => `${name} (${count})`).join(', '))
