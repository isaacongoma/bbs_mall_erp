import { __ } from '@/core/i18n'

type AnyRecord = Record<string, any>

export interface StepNode extends AnyRecord {
  _id: string
  doctype: string
  step_type: string
  action_type: string
  step_key: string
  target: string
  output_alias: string
  params: string
  step_condition: string
  related_condition: string
  children: { If: StepNode[]; Else: StepNode[] }
  _outcomeKey?: string
}

export interface PlacedStep {
  node: StepNode
  position: { x: number; y: number }
}

const COLUMN_WIDTH = 300
const BRANCH_OFFSET = 108

export const EVENT_MATCHED = 'context.get("event", {}).get("outcome") == "Matched"'

let uid = 0

export function isBranching(node?: AnyRecord | null): boolean {
  return node?.step_type === 'If' || node?.step_type === 'WaitForEvent'
}

export function armLabels(node?: AnyRecord | null): { If: string; Else: string } {
  return node?.step_type === 'WaitForEvent'
    ? { If: __('Event happened'), Else: __('Timed out') }
    : { If: __('True'), Else: __('False') }
}

function hasArms(node: StepNode): boolean {
  return Boolean(node.children?.If.length || node.children?.Else.length)
}

export function newStep(values: AnyRecord = {}): StepNode {
  return {
    _id: `step-${++uid}`,
    doctype: 'Automation Action',
    step_type: 'Action',
    action_type: '',
    step_key: '',
    target: 'trigger',
    output_alias: '',
    params: '{}',
    step_condition: '',
    related_condition: '',
    children: { If: [], Else: [] },
    ...values,
  }
}

function armOf(row: AnyRecord): 'If' | 'Else' {
  return row.branch === 'Else' ? 'Else' : 'If'
}

function rowIdx(row: AnyRecord, index: number): number {
  return row.idx || index + 1
}

function isOutcomeOf(node?: StepNode, next?: StepNode): boolean {
  return node?.step_type === 'WaitForEvent' && next?.step_type === 'If' && next.step_condition === EVENT_MATCHED
}

function collapseOutcomeSteps(nodes: StepNode[]) {
  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index]
    if (!node) continue
    if (isBranching(node)) {
      collapseOutcomeSteps(node.children.If)
      collapseOutcomeSteps(node.children.Else)
    }
    const outcome = nodes[index + 1]
    if (!outcome || !isOutcomeOf(node, outcome)) continue
    node.children = outcome.children
    node._outcomeKey = outcome.step_key
    nodes.splice(index + 1, 1)
  }
}

export function toTree(rows: AnyRecord[] = []): StepNode[] {
  const nodes = rows.map((row) => newStep({ ...row, children: { If: [], Else: [] } }))
  const byIdx = new Map(nodes.map((node, index) => [rowIdx(rows[index] ?? {}, index), node]))
  const roots: StepNode[] = []
  nodes.forEach((node, index) => {
    const row = rows[index] ?? {}
    const parent = row.parent_step && byIdx.get(row.parent_step)
    if (parent) parent.children[armOf(row)].push(node)
    else roots.push(node)
  })
  collapseOutcomeSteps(roots)
  return roots
}

const KEY_BASES: Record<string, string> = { If: 'condition', Wait: 'wait', WaitForEvent: 'wait_for_event' }

function scrub(text: string): string {
  return String(text || 'step')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/\W+/g, '_')
    .toLowerCase()
}

export function defaultStepKey(node: AnyRecord, taken: Set<string> = new Set()): string {
  const base = scrub(node.action_type || KEY_BASES[node.step_type] || node.step_type)
  let key = base
  let suffix = 2
  while (taken.has(key)) key = `${base}_${suffix++}`
  return key
}

function outcomeRow(node: StepNode, idx: number, parentIdx: number, branch: string, taken: Set<string>): AnyRecord {
  const key = node._outcomeKey || `${node.step_key || 'wait'}_outcome`
  return {
    doctype: 'Automation Action',
    step_type: 'If',
    step_key: taken.has(key) ? `${key}_2` : key,
    action_type: '',
    target: 'trigger',
    output_alias: '',
    params: '{}',
    step_condition: EVENT_MATCHED,
    related_condition: '',
    idx,
    parent_step: parentIdx,
    branch: parentIdx ? branch : '',
  }
}

function appendRows(nodes: StepNode[], rows: AnyRecord[], parentIdx: number, branch: string, taken: Set<string>) {
  nodes.forEach((node) => {
    const { children } = node
    const row: AnyRecord = { ...node }
    delete row.children
    delete row._id
    delete row._outcomeKey
    row.step_key = row.step_key || defaultStepKey(node, taken)
    taken.add(row.step_key)
    rows.push({ ...row, idx: rows.length + 1, parent_step: parentIdx, branch: parentIdx ? branch : '' })
    let idx = rows.length
    if (!isBranching(node) || !hasArms(node)) return
    if (node.step_type === 'WaitForEvent') {
      const outcome = outcomeRow(node, rows.length + 1, parentIdx, branch, taken)
      taken.add(outcome.step_key)
      rows.push(outcome)
      idx = rows.length
    }
    appendRows(children.If, rows, idx, 'If', taken)
    appendRows(children.Else, rows, idx, 'Else', taken)
  })
}

export function toRows(tree: StepNode[]): AnyRecord[] {
  const rows: AnyRecord[] = []
  appendRows(tree, rows, 0, '', new Set())
  return rows
}

function takeRowKeys(nodes: StepNode[], queue: AnyRecord[]) {
  nodes.forEach((node) => {
    const row = queue.shift()
    if (!row) return
    node.step_key = row.step_key
    node.idx = row.idx
    if (!isBranching(node) || !hasArms(node)) return
    if (node.step_type === 'WaitForEvent') node._outcomeKey = queue.shift()?.step_key
    takeRowKeys(node.children.If, queue)
    takeRowKeys(node.children.Else, queue)
  })
}

export function adoptRowKeys(tree: StepNode[], rows: AnyRecord[]) {
  takeRowKeys(tree, [...rows])
}

function place(nodes: StepNode[], startX: number, y: number, placed: PlacedStep[], spread = BRANCH_OFFSET): number {
  let x = startX
  nodes.forEach((node) => {
    placed.push({ node, position: { x, y } })
    x += COLUMN_WIDTH
    if (!isBranching(node)) return
    const ifEnd = place(node.children.If, x, y - spread, placed, spread / 2)
    const elseEnd = place(node.children.Else, x, y + spread, placed, spread / 2)
    x = Math.max(ifEnd, elseEnd)
  })
  return x
}

export function layoutSteps(tree: StepNode[]): PlacedStep[] {
  const placed: PlacedStep[] = []
  place(tree, COLUMN_WIDTH, 0, placed)
  return placed
}

export function listOf(tree: StepNode[], node: StepNode): StepNode[] | null {
  if (tree.includes(node)) return tree
  for (const candidate of tree) {
    if (!isBranching(candidate)) continue
    const found = listOf(candidate.children.If, node) || listOf(candidate.children.Else, node)
    if (found) return found
  }
  return null
}

export function removeStep(tree: StepNode[], nodeOrId: StepNode | string): boolean {
  const id = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId?._id
  const node = layoutSteps(tree).find((entry) => entry.node._id === id)?.node
  const list = node && listOf(tree, node)
  if (!node || !list) return false
  list.splice(list.indexOf(node), 1)
  return true
}

export function insertAfter(tree: StepNode[], node: StepNode, step: StepNode): StepNode {
  const list = listOf(tree, node) || tree
  list.splice(list.indexOf(node) + 1, 0, step)
  return step
}

function collectBefore(nodes: StepNode[], target: StepNode, earlier: StepNode[]): boolean {
  for (const node of nodes) {
    if (node === target) return true
    earlier.push(node)
    if (!isBranching(node)) continue
    if (collectBefore(node.children.If, target, earlier)) return true
    if (collectBefore(node.children.Else, target, earlier)) return true
  }
  return false
}

export function stepsBefore(tree: StepNode[], node: StepNode): StepNode[] {
  const earlier: StepNode[] = []
  return collectBefore(tree, node, earlier) ? earlier : []
}
