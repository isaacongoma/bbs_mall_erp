import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import prettier from 'prettier'

const RUNTIME_GLOBALS = new Set([
  'frappe',
  'erpnext',
  'hrms',
  '__',
  'cur_frm',
  'cur_dialog',
  'cur_page',
  'locals',
  'flt',
  'cint',
  'cstr',
  'format_currency',
  'fmt_money',
  'get_number_format',
  'get_number_format_info',
  'precision',
  'roundNumber',
  'in_list',
  'has_common',
  'encode_uri',
  'copy_dict',
  'extend_cscript',
  'cur_list',
  'moment',
  'frappe_ui',
  'jQuery',
  '$',
  'doc',
  'cdt',
  'cdn',
  'refresh_field',
  'refresh_many',
  'toggle_field',
  'get_server_fields',
  'validated',
  'msgprint',
  'is_null',
  'getchildren',
  'new_doc',
  'make_doc',
  'cache',
  'cur_tree',
  'cur_pos',
  'Plaid',
  'Awesomplete',
  'repl',
  'format_number',
  'hide_field',
  'unhide_field',
  'set_field_options',
  'open_url_post',
  'onScan',
  'refresh_many',
  'get_currency_symbol',
  'round_based_on_smallest_currency_fraction',
  'remainder',
  'toTitle',
])

function compilerOptions() {
  return {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts'],
    skipLibCheck: true,
    noImplicitAny: false,
    types: [],
  }
}

function diagnosticsFor(fileName, text, extra = {}) {
  const options = { ...compilerOptions(), ...extra }
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  host.getSourceFile = (name, languageVersion, ...rest) =>
    path.resolve(name) === path.resolve(fileName)
      ? ts.createSourceFile(name, text, languageVersion, true)
      : original(name, languageVersion, ...rest)
  host.fileExists = (name) => path.resolve(name) === path.resolve(fileName) || ts.sys.fileExists(name)
  host.readFile = (name) => (path.resolve(name) === path.resolve(fileName) ? text : ts.sys.readFile(name))
  const program = ts.createProgram([fileName], options, host)
  return program.getSemanticDiagnostics(program.getSourceFile(fileName))
}

function namespaceReferences(fileName, text) {
  const names = new Set()
  const declared = new Set()
  const tracked = ['frappe', 'erpnext', 'hrms', '$', 'jQuery', 'moment']
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS)
  const collect = (node) => {
    if (
      (ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name)
    ) {
      declared.add(node.name.text)
    }
    ts.forEachChild(node, collect)
  }
  collect(source)
  const visit = (node) => {
    if (ts.isIdentifier(node) && tracked.includes(node.text) && !declared.has(node.text)) {
      const parent = node.parent
      const isMemberName = ts.isPropertyAccessExpression(parent) && parent.name === node
      const isKey = ts.isPropertyAssignment(parent) && parent.name === node
      if (!isMemberName && !isKey) names.add(node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return names
}

function freeIdentifiers(fileName, text) {
  const names = namespaceReferences(fileName, text)
  for (const diagnostic of diagnosticsFor(fileName, text)) {
    if (diagnostic.code === 2304 && diagnostic.start !== undefined) {
      names.add(text.slice(diagnostic.start, diagnostic.start + diagnostic.length))
    }
  }
  return names
}

function usesThis(node) {
  let found = false
  const visit = (child) => {
    if (found) return
    if (child.kind === ts.SyntaxKind.ThisKeyword) {
      found = true
      return
    }
    if (
      ts.isFunctionExpression(child) ||
      ts.isFunctionDeclaration(child) ||
      ts.isMethodDeclaration(child) ||
      ts.isClassLike(child)
    ) {
      return
    }
    ts.forEachChild(child, visit)
  }
  if (node.body) ts.forEachChild(node.body, visit)
  return found
}

function anyType(factory) {
  return factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
}

function typeParameters(factory, node) {
  const params = node.parameters.map((parameter) =>
    parameter.type || parameter.name.getText?.() === 'this'
      ? parameter
      : factory.updateParameterDeclaration(
          parameter,
          parameter.modifiers,
          parameter.dotDotDotToken,
          parameter.name,
          parameter.questionToken,
          parameter.dotDotDotToken ? factory.createArrayTypeNode(anyType(factory)) : anyType(factory),
          parameter.initializer,
        ),
  )
  const insideObjectOrFunction =
    (ts.isFunctionExpression(node) || ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) &&
    !ts.isClassLike(node.parent) &&
    usesThis(node) &&
    !node.parameters.some((parameter) => parameter.name.escapedText === 'this')
  if (insideObjectOrFunction) {
    params.unshift(
      factory.createParameterDeclaration(undefined, undefined, 'this', undefined, anyType(factory), undefined),
    )
  }
  return params
}

function isVarStatement(node) {
  return ts.isVariableStatement(node) && !(node.declarationList.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const))
}

function collectNestedVars(body, factory, context) {
  const names = []
  const seen = new Set()
  const rewrite = (node, atTop) => {
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return node
    if (isVarStatement(node) && !atTop && node.declarationList.declarations.every((d) => ts.isIdentifier(d.name))) {
      const assignments = []
      for (const declaration of node.declarationList.declarations) {
        if (!seen.has(declaration.name.text)) {
          seen.add(declaration.name.text)
          names.push(declaration.name.text)
        }
        if (declaration.initializer) {
          assignments.push(factory.createAssignment(factory.createIdentifier(declaration.name.text), declaration.initializer))
        }
      }
      if (!assignments.length) return factory.createEmptyStatement()
      const expression = assignments.reduce((left, right) => factory.createComma(left, right))
      return factory.createExpressionStatement(expression)
    }
    return ts.visitEachChild(node, (child) => rewrite(child, false), context)
  }
  const statements = body.statements.map((statement) => rewrite(statement, true))
  return { names, statements }
}

function hoistVars(body, factory, context) {
  const { names, statements } = collectNestedVars(body, factory, context)
  if (!names.length) return body
  const declaration = factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      names.map((name) => factory.createVariableDeclaration(name, undefined, anyType(factory), undefined)),
      ts.NodeFlags.Let,
    ),
  )
  return factory.updateBlock(body, [declaration, ...statements.filter((statement) => !ts.isEmptyStatement(statement))])
}

function annotate(source) {
  const transformer = (context) => (root) => {
    const { factory } = context
    const visit = (node) => {
      const original = node
      if (ts.isFunctionLike(node) && node.body && ts.isBlock(node.body)) {
        node = ts.setOriginalNode(factory.cloneNode(node), node)
        node.body = hoistVars(node.body, factory, context)
      }
      const inLoopHead =
        ts.isVariableDeclaration(original) &&
        original.parent?.parent !== undefined &&
        (ts.isForInStatement(original.parent.parent) || ts.isForOfStatement(original.parent.parent))
      node = ts.visitEachChild(node, visit, context)
      if (ts.isFunctionExpression(node)) {
        return factory.updateFunctionExpression(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          typeParameters(factory, node),
          node.type,
          node.body,
        )
      }
      if (ts.isArrowFunction(node)) {
        return factory.updateArrowFunction(
          node,
          node.modifiers,
          node.typeParameters,
          typeParameters(factory, node),
          node.type,
          node.equalsGreaterThanToken,
          node.body,
        )
      }
      if (ts.isFunctionDeclaration(node)) {
        return factory.updateFunctionDeclaration(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.typeParameters,
          typeParameters(factory, node),
          node.type,
          node.body,
        )
      }
      if (ts.isMethodDeclaration(node)) {
        return factory.updateMethodDeclaration(
          node,
          node.modifiers,
          node.asteriskToken,
          node.name,
          node.questionToken,
          node.typeParameters,
          typeParameters(factory, node),
          node.type,
          node.body,
        )
      }
      if (
        ts.isBinaryExpression(node) &&
        [ts.SyntaxKind.AmpersandToken, ts.SyntaxKind.BarToken, ts.SyntaxKind.CaretToken].includes(node.operatorToken.kind)
      ) {
        const needsNumber = (operand) => {
          const inner = ts.isParenthesizedExpression(operand) ? operand.expression : operand
          return (
            (ts.isBinaryExpression(inner) &&
              [
                ts.SyntaxKind.EqualsEqualsToken,
                ts.SyntaxKind.EqualsEqualsEqualsToken,
                ts.SyntaxKind.ExclamationEqualsToken,
                ts.SyntaxKind.ExclamationEqualsEqualsToken,
                ts.SyntaxKind.LessThanToken,
                ts.SyntaxKind.GreaterThanToken,
                ts.SyntaxKind.LessThanEqualsToken,
                ts.SyntaxKind.GreaterThanEqualsToken,
              ].includes(inner.operatorToken.kind)) ||
            (ts.isPrefixUnaryExpression(inner) && inner.operator === ts.SyntaxKind.ExclamationToken)
          )
        }
        const wrap = (operand) =>
          needsNumber(operand) ? factory.createCallExpression(factory.createIdentifier('Number'), undefined, [operand]) : operand
        return factory.updateBinaryExpression(node, wrap(node.left), node.operatorToken, wrap(node.right))
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'parseInt' &&
        node.arguments.length > 0 &&
        !ts.isStringLiteralLike(node.arguments[0])
      ) {
        const [first, ...rest] = node.arguments
        return factory.updateCallExpression(node, node.expression, node.typeArguments, [
          factory.createCallExpression(factory.createIdentifier('String'), undefined, [first]),
          ...rest,
        ])
      }
      if (ts.isElementAccessExpression(node)) {
        let target = node.expression
        while (ts.isParenthesizedExpression(target)) target = target.expression
        if (ts.isObjectLiteralExpression(target)) {
          return factory.updateElementAccessExpression(
            node,
            factory.createParenthesizedExpression(factory.createAsExpression(node.expression, anyType(factory))),
            node.argumentExpression,
          )
        }
      }
      if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
        const hasIndex = node.members.some((member) => ts.isIndexSignatureDeclaration(member))
        if (hasIndex) return node
        const signature = factory.createIndexSignature(
          undefined,
          [factory.createParameterDeclaration(undefined, undefined, 'key', undefined, factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword))],
          anyType(factory),
        )
        const members = [signature, ...node.members]
        return ts.isClassDeclaration(node)
          ? factory.updateClassDeclaration(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, members)
          : factory.updateClassExpression(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, members)
      }
      if (ts.isConstructorDeclaration(node)) {
        return factory.updateConstructorDeclaration(node, node.modifiers, typeParameters(factory, node), node.body)
      }
      if (ts.isSetAccessorDeclaration(node)) {
        return factory.updateSetAccessorDeclaration(node, node.modifiers, node.name, typeParameters(factory, node), node.body)
      }
      if (
        ts.isVariableDeclaration(node) &&
        !node.type &&
        ts.isIdentifier(node.name) &&
        !inLoopHead &&
        (!node.initializer ||
          ts.isObjectLiteralExpression(node.initializer) ||
          ts.isArrayLiteralExpression(node.initializer))
      ) {
        return factory.updateVariableDeclaration(node, node.name, node.exclamationToken, anyType(factory), node.initializer)
      }
      if (ts.isVariableDeclarationList(node) && !(node.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const))) {
        return factory.createVariableDeclarationList(node.declarations, node.flags | ts.NodeFlags.Let)
      }
      return node
    }
    return ts.visitNode(root, visit)
  }
  const result = ts.transform(source, [transformer])
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
  return printer.printFile(result.transformed[0])
}

function fixUnused(fileName, text) {
  for (let round = 0; round < 8; round += 1) {
    const diagnostics = diagnosticsFor(fileName, text, { noUnusedParameters: true, noUnusedLocals: true, allowJs: true })
    const unused = diagnostics.filter((entry) => entry.code === 6133 || entry.code === 6196 || entry.code === 6198)
    if (!unused.length) return text
    const edits = []
    const handledOwners = new Set()
    const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true)
    for (const entry of unused) {
      const start = entry.start
      const length = entry.length
      let node = null
      const visit = (child) => {
        if (child.getStart(source) <= start && child.getEnd() >= start + length) {
          node = child
          ts.forEachChild(child, visit)
        }
      }
      visit(source)
      if (!node) continue
      let target = node
      while (target && !ts.isParameter(target) && !ts.isVariableDeclaration(target) && !ts.isImportSpecifier(target) && !ts.isBindingElement(target)) {
        target = target.parent
      }
      if (!target) continue
      if (ts.isParameter(target)) {
        const owner = target.parent
        if (handledOwners.has(owner)) continue
        handledOwners.add(owner)
        const list = owner.parameters
        const isUnused = (item) => unused.some((u) => u.start >= item.getStart(source) && u.start < item.getEnd())
        let firstTrailing = list.length
        while (firstTrailing > 0 && isUnused(list[firstTrailing - 1])) firstTrailing -= 1
        if (firstTrailing < list.length) {
          const previous = list[firstTrailing - 1]
          const from = previous ? previous.getEnd() : list[firstTrailing].getStart(source)
          edits.push({ from, to: list[list.length - 1].getEnd(), text: '' })
        }
        list.forEach((item, index) => {
          if (index < firstTrailing && isUnused(item) && !item.name.getText(source).startsWith('_')) {
            edits.push({ from: item.name.getStart(source), to: item.name.getStart(source), text: '_' })
          }
        })
      } else if (
        ts.isVariableDeclaration(target) &&
        ts.isIdentifier(target.name) &&
        ts.isVariableDeclarationList(target.parent) &&
        target.parent.declarations.length === 1 &&
        ts.isVariableStatement(target.parent.parent) &&
        !ts.isExportDeclaration(target.parent.parent)
      ) {
        const statement = target.parent.parent
        const initializer = target.initializer
        const isPure = (expression) =>
          !expression ||
          ts.isIdentifier(expression) ||
          expression.kind === ts.SyntaxKind.ThisKeyword ||
          ts.isLiteralExpression(expression) ||
          ts.isArrowFunction(expression) ||
          ts.isFunctionExpression(expression) ||
          ts.isObjectLiteralExpression(expression) ||
          ts.isArrayLiteralExpression(expression) ||
          ts.isTemplateExpression(expression) ||
          ((ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) &&
            isPure(expression.expression))
        if (isPure(initializer)) {
          edits.push({ from: statement.getFullStart(), to: statement.getEnd(), text: '' })
        } else if (ts.isCallExpression(initializer) || ts.isNewExpression(initializer) || ts.isAwaitExpression(initializer)) {
          edits.push({ from: statement.getStart(source), to: initializer.getStart(source), text: '' })
        }
      } else if (ts.isBindingElement(target) && ts.isObjectBindingPattern(target.parent) && !target.dotDotDotToken) {
        const elements = target.parent.elements
        const position = elements.indexOf(target)
        if (position > 0) edits.push({ from: elements[position - 1].getEnd(), to: target.getEnd(), text: '' })
        else if (elements.length > 1) edits.push({ from: target.getStart(source), to: elements[1].getStart(source), text: '' })
        else edits.push({ from: target.getStart(source), to: target.getEnd(), text: '' })
      } else if (ts.isImportSpecifier(target)) {
        const elements = target.parent.elements
        const position = elements.indexOf(target)
        if (position > 0) edits.push({ from: elements[position - 1].getEnd(), to: target.getEnd(), text: '' })
        else if (elements.length > 1) edits.push({ from: target.getStart(source), to: elements[1].getStart(source), text: '' })
        else edits.push({ from: target.getStart(source), to: target.getEnd(), text: '' })
      }
    }
    if (!edits.length) return text
    edits.sort((a, b) => b.from - a.from)
    const seen = new Set()
    for (const edit of edits) {
      const key = `${edit.from}:${edit.to}`
      if (seen.has(key)) continue
      seen.add(key)
      text = text.slice(0, edit.from) + edit.text + text.slice(edit.to)
    }
  }
  return text
}

export async function portClientScript(inputPath) {
  const text = fs.readFileSync(inputPath, 'utf8')
  const free = [...freeIdentifiers(inputPath, text)]
  const runtime = free.filter((name) => RUNTIME_GLOBALS.has(name)).sort()
  const unknown = free.filter((name) => !RUNTIME_GLOBALS.has(name)).sort()
  const source = ts.createSourceFile(inputPath, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS)
  let output = annotate(source)
  const header = runtime.length ? `import { ${runtime.join(', ')} } from '@/shared/frappe'\n\n` : ''
  output = header + output
  const tsName = inputPath.replace(/\.js$/, '.ts')
  output = fixUnused(tsName, output)
  const formatted = await prettier.format(output, { parser: 'typescript', semi: false, singleQuote: true, printWidth: 120 })
  return { code: formatted, runtime, unknown }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
if (isMain) {
  const [input, output] = process.argv.slice(2)
  const { code, runtime, unknown } = await portClientScript(input)
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true })
    fs.writeFileSync(output, code, 'utf8')
  } else {
    process.stdout.write(code)
  }
  process.stderr.write(`runtime: ${runtime.join(',')}\nunknown free names: ${unknown.join(',')}\n`)
}
