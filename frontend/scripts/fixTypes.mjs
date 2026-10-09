import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import prettier from 'prettier'

const [rootArg = 'src/shared/frappe/upstream'] = process.argv.slice(2)
const root = path.resolve(rootArg).replaceAll('\\', '/')

function loadProgram() {
  const configPath = path.resolve('tsconfig.json')
  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath))
  return ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true })
}

function nodeAt(source, start) {
  let found = source
  const visit = (node) => {
    if (node.getStart(source) <= start && start < node.getEnd()) {
      found = node
      ts.forEachChild(node, visit)
    }
  }
  visit(source)
  return found
}

function exactNodeAt(source, start, length) {
  let best = null
  const visit = (node) => {
    if (node.getStart(source) === start && node.getEnd() === start + length) best = node
    if (node.getStart(source) <= start && start + length <= node.getEnd()) ts.forEachChild(node, visit)
  }
  visit(source)
  return best
}

function wrapAny(source, node) {
  return { from: node.getStart(source), to: node.getEnd(), text: `(${node.getText(source)} as any)` }
}

function editFor(source, diagnostic) {
  const start = diagnostic.start
  const length = diagnostic.length
  const node = exactNodeAt(source, start, length) ?? nodeAt(source, start)
  switch (diagnostic.code) {
    case 7034: {
      const declaration = ts.isVariableDeclaration(node) ? node : node.parent
      if (ts.isVariableDeclaration(declaration) && !declaration.type) {
        return { from: declaration.name.getEnd(), to: declaration.name.getEnd(), text: ': any' }
      }
      return null
    }
    case 2339: {
      const access = ts.isPropertyAccessExpression(node) ? node : node.parent
      if (ts.isPropertyAccessExpression(access)) return wrapAny(source, access.expression)
      return null
    }
    case 18046:
    case 18047:
    case 18048:
    case 2531:
    case 2532:
    case 2533:
    case 2362:
    case 2363:
    case 2538:
    case 2349:
    case 7053:
    case 2345: {
      if (diagnostic.code === 7053 || diagnostic.code === 2349 || diagnostic.code === 2532) {
        return wrapAny(source, node)
      }
      return wrapAny(source, node)
    }
    default:
      return null
  }
}

async function main() {
  for (let round = 0; round < 6; round += 1) {
    const program = loadProgram()
    const edits = new Map()
    let total = 0
    for (const sourceFile of program.getSourceFiles()) {
      const normalized = sourceFile.fileName.replaceAll('\\', '/')
      if (!normalized.startsWith(root) || normalized.endsWith('.d.ts')) continue
      const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile)
      const fileEdits = []
      const seen = new Set()
      for (const diagnostic of diagnostics) {
        if (diagnostic.start === undefined || diagnostic.length === undefined) continue
        const edit = editFor(sourceFile, diagnostic)
        if (!edit) continue
        const key = `${edit.from}:${edit.to}`
        if (seen.has(key)) continue
        seen.add(key)
        fileEdits.push(edit)
      }
      if (!fileEdits.length) continue
      fileEdits.sort((a, b) => b.from - a.from)
      const filtered = []
      let limit = Infinity
      for (const edit of fileEdits) {
        if (edit.to > limit) continue
        filtered.push(edit)
        limit = edit.from
      }
      edits.set(sourceFile.fileName, filtered)
      total += filtered.length
    }
    if (!total) break
    for (const [fileName, fileEdits] of edits) {
      let text = fs.readFileSync(fileName, 'utf8')
      for (const edit of fileEdits) text = text.slice(0, edit.from) + edit.text + text.slice(edit.to)
      const formatted = await prettier.format(text, { parser: 'typescript', semi: false, singleQuote: true, printWidth: 120 })
      fs.writeFileSync(fileName, formatted, 'utf8')
    }
    console.log(`round ${round + 1}: ${total} edits`)
  }
}

await main()
