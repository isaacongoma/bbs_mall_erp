import fs from 'node:fs'
import path from 'node:path'
import { it } from 'vitest'
import { erpnext, frappe } from '../frappe'

function walk(directory: string, result: string[] = []): string[] {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(full, result)
    else if (entry.name.endsWith('.ts')) result.push(full)
  }
  return result
}

it('reports api coverage', { timeout: 60000 }, () => {
  const root = path.resolve(__dirname, process.env.COVERAGE_ROOT ?? '../../modules/erpnext')
  const counts = new Map<string, number>()
  for (const file of walk(root)) {
    if (file.includes(`${path.sep}doctypes${path.sep}`) || file.includes('tests')) continue
    void 0
    const text = fs.readFileSync(file, 'utf8')
    for (const match of text.matchAll(/\bfrappe((?:\.[A-Za-z_][A-Za-z0-9_]*){1,3})/g)) {
      counts.set(`frappe${match[1]}`, (counts.get(`frappe${match[1]}`) ?? 0) + 1)
    }
  }
  const missing: Array<[string, number]> = []
  for (const [chain, count] of counts) {
    const parts = chain.split('.').slice(1)
    let target: any = frappe
    let ok = true
    for (const part of parts) {
      if (target == null || typeof target !== 'object' && typeof target !== 'function') {
        break
      }
      if (!(part in target)) {
        ok = false
        break
      }
      target = Reflect.get(target, part)
    }
    if (!ok) missing.push([chain, count])
  }
  const prefixes = new Map<string, number>()
  for (const [chain, count] of missing) {
    const parts = chain.split('.')
    const prefix = parts.slice(0, Math.min(parts.length, 3)).join('.')
    prefixes.set(prefix, (prefixes.get(prefix) ?? 0) + count)
  }
  const out = [...prefixes.entries()].sort((a, b) => b[1] - a[1])
  fs.writeFileSync(path.resolve(__dirname, process.env.COVERAGE_OUT ?? '../../../coverage_missing.txt'), out.map(([k, v]) => `${v}\t${k}`).join('\n'))
  void erpnext
})
