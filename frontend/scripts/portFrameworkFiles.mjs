import fs from 'node:fs'
import path from 'node:path'
import { portClientScript } from './portClientScript.mjs'

const [list] = process.argv.slice(2)
const base = path.resolve('../vendor/frappe/frappe/public/js/frappe')
const target = path.resolve('src/shared/frappe/upstream')
const files = list.split(',')
for (const file of files) {
  const input = path.join(base, file)
  const output = path.join(target, file.replace(/\.js$/, '.ts'))
  try {
    const { code, unknown } = await portClientScript(input)
    fs.mkdirSync(path.dirname(output), { recursive: true })
    fs.writeFileSync(output, code.replace("from '@/shared/frappe'", "from '@/shared/frappe/runtime'"), 'utf8')
    console.log(`ok ${file} unknown: ${unknown.join(',')}`)
  } catch (error) {
    console.log(`FAILED ${file}: ${String(error).split('\n')[0]}`)
  }
}
