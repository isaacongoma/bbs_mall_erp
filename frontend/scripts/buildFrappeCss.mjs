import { compileString } from 'sass'
import { writeFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import postcss from 'postcss'

const root = path.resolve(import.meta.dirname, '..')
const publicDir = path.resolve(root, '../vendor/frappe/frappe/public')
const scss = path.join(publicDir, 'scss')

const source = `
@import "desk/variables";
@import "common/mixins";
@import "espresso_components";
@import "frappe/public/css/espresso/legacy.css";
.frappe-page-host {
  @import "~bootstrap/scss/grid";
  @import "~bootstrap/scss/forms";
  @import "~bootstrap/scss/tables";
  @import "~bootstrap/scss/alert";
  @import "~bootstrap/scss/buttons";
  @import "~bootstrap/scss/button-group";
  @import "~bootstrap/scss/dropdown";
  @import "~bootstrap/scss/badge";
  @import "~bootstrap/scss/nav";
  @import "~bootstrap/scss/input-group";
  @import "~bootstrap/scss/custom-forms";
  @import "~bootstrap/scss/card";
  @import "~bootstrap/scss/utilities";
  @import "common/css_variables";
  @import "desk/css_variables";
  @import "common/icons";
  @import "common/global";
  @import "desk/global";
  @import "common/buttons";
  @import "common/alert";
  @import "common/awesomeplete";
  @import "common/indicator";
  @import "common/flex";
  @import "common/grid";
  @import "common/form";
  @import "desk/page";
  @import "desk/tree";
  @import "desk/report";
  @import "desk/charts";
  @import "desk/filters";
  @import "desk/frappe_datatable";
}
`

function resolveImport(url) {
  let base
  if (url.startsWith('~')) base = path.join(root, 'node_modules', url.slice(1))
  else if (url.startsWith('frappe/public/')) base = path.join(publicDir, url.slice('frappe/public/'.length))
  else base = path.join(scss, url)
  const dir = path.dirname(base)
  const name = path.basename(base)
  for (const file of [base, `${base}.scss`, path.join(dir, `_${name}.scss`), path.join(dir, `${name}.scss`), path.join(base, 'index.scss')]) {
    if (existsSync(file) && statSync(file).isFile()) return pathToFileURL(file)
  }
  return null
}

const result = compileString(source, {
  importers: [{ findFileUrl: (url) => resolveImport(url) }],
  loadPaths: [scss],
  silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'mixed-decls', 'slash-div', 'if-function'],
  quietDeps: true,
  logger: { warn() {}, debug() {} },
})
const SCOPE = '.frappe-page-host'

function inlineImports(css) {
  return css.replace(/@import "frappe\/public\/([^"]+)";\n?/g, (match, rel) => {
    const file = path.join(publicDir, rel)
    return existsSync(file) ? `${readFileSync(file, 'utf8')}\n` : ''
  })
}

function scopeSelector(selector) {
  const trimmed = selector.trim()
  const bare = trimmed.startsWith(`${SCOPE} `) ? trimmed.slice(SCOPE.length + 1) : trimmed
  if (/^\.es-[\w-]+/.test(bare)) return bare
  if (/^\.(icon|icon-xs|icon-sm|icon-base|icon-md|icon-lg|icon-xl|no-stroke|current-color)$/.test(bare)) return bare
  if (trimmed.startsWith(SCOPE)) return trimmed.replace(/^\.frappe-page-host\s+(:root|html|body)(?=[\s.:[,]|$)/, SCOPE)
  if (/^(:root|html|body)$/.test(trimmed) || trimmed === '[data-theme=light]') return SCOPE
  if (trimmed === '[data-theme=dark]') return `[data-theme=dark] ${SCOPE}`
  if (trimmed.startsWith('[data-theme=dark] ')) return `[data-theme=dark] ${SCOPE} ${trimmed.slice('[data-theme=dark] '.length)}`
  return `${SCOPE} ${trimmed}`
}

const parsed = postcss.parse(inlineImports(result.css))
parsed.walkRules((rule) => {
  if (rule.parent && rule.parent.type === 'rule') return
  let parent = rule.parent
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule' && /keyframes/.test(parent.name)) return
    parent = parent.parent
  }
  rule.selectors = [...new Set(rule.selectors.map(scopeSelector))]
})
const GLOBALS = ':root {\n  --icon-stroke: currentColor;\n  --icon-fill: transparent;\n}\n'
const output = GLOBALS + parsed.toString().replace(/@charset "UTF-8";\n?/, '')
writeFileSync(path.join(root, 'src/shared/frappe/styles/frappePage.css'), output)
console.log('bytes', output.length)
