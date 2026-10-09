import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import prettier from 'prettier'

const [root, mode] = process.argv.slice(2)
const REVERSE = mode === 'reverse' || mode === 'patterns'
const ONLY_PATTERNS = mode === 'patterns'

function walk(directory, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(full, result)
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) result.push(full)
  }
  return result
}

function makeOptional(factory, node) {
  let changed = false
  let lastPattern = -1
  node.parameters.forEach((parameter, position) => {
    if (!ts.isIdentifier(parameter.name)) lastPattern = position
  })
  const parameters = node.parameters.map((parameter, position) => {
    if (!REVERSE && position < lastPattern) return parameter
    const isThis = ts.isIdentifier(parameter.name) && parameter.name.text === 'this'
    const isPattern = !ts.isIdentifier(parameter.name)
    if ((ONLY_PATTERNS && !isPattern) || isThis || parameter.initializer || parameter.dotDotDotToken || (isPattern && !REVERSE) || Boolean(parameter.questionToken) === !REVERSE) return parameter
    changed = true
    return factory.updateParameterDeclaration(
      parameter,
      parameter.modifiers,
      parameter.dotDotDotToken,
      parameter.name,
      REVERSE ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
      parameter.type,
      parameter.initializer,
    )
  })
  return changed ? parameters : null
}

function transform(source) {
  const transformer = (context) => (rootNode) => {
    const { factory } = context
    const visit = (node) => {
      node = ts.visitEachChild(node, visit, context)
      const parameters = ts.isFunctionLike(node) && node.parameters ? makeOptional(factory, node) : null
      if (!parameters) return node
      if (ts.isFunctionDeclaration(node))
        return factory.updateFunctionDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.typeParameters, parameters, node.type, node.body)
      if (ts.isFunctionExpression(node))
        return factory.updateFunctionExpression(node, node.modifiers, node.asteriskToken, node.name, node.typeParameters, parameters, node.type, node.body)
      if (ts.isArrowFunction(node))
        return factory.updateArrowFunction(node, node.modifiers, node.typeParameters, parameters, node.type, node.equalsGreaterThanToken, node.body)
      if (ts.isMethodDeclaration(node))
        return factory.updateMethodDeclaration(node, node.modifiers, node.asteriskToken, node.name, node.questionToken, node.typeParameters, parameters, node.type, node.body)
      if (ts.isConstructorDeclaration(node)) return factory.updateConstructorDeclaration(node, node.modifiers, parameters, node.body)
      return node
    }
    return ts.visitNode(rootNode, visit)
  }
  const result = ts.transform(source, [transformer])
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
  return printer.printFile(result.transformed[0])
}

let count = 0
for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)
  const output = transform(source)
  const formatted = await prettier.format(output, { parser: 'typescript', semi: false, singleQuote: true, printWidth: 120 })
  if (formatted !== text) {
    fs.writeFileSync(file, formatted, 'utf8')
    count += 1
  }
}
console.log(`updated ${count} files`)
