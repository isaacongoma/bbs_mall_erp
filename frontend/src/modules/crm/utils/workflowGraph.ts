import { __ } from '@/core/i18n'
import { actionSchema } from '../stores/workflowCapabilitiesStore'
import { summarizeCondition } from './workflowConditions'
import { TRIGGER_STYLE, stepIcon } from './workflowIcons'
import { armLabels, isBranching, layoutSteps, type StepNode } from './workflowSteps'
import { triggerDefinition } from './workflowTriggers'
import { stepIssue, triggerIssue } from './workflowValidation'

type AnyRecord = Record<string, any>

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  label: string | null
  type: string
  labelBgPadding: [number, number]
  labelBgBorderRadius: number
  style: AnyRecord
}

function edge(source: string, target: string, label: string | null): FlowEdge {
  return {
    id: `${source}->${target}:${label || ''}`,
    source,
    target,
    sourceHandle: 'output',
    targetHandle: 'input',
    label,
    type: 'bezier',
    labelBgPadding: [14, 2],
    labelBgBorderRadius: 6,
    style: { stroke: '#4E4E4E', strokeWidth: 1 },
  }
}

type Source = { id: string; label: string | null }

function appendEdges(nodes: StepNode[], sources: Source[], edges: FlowEdge[]): Source[] {
  let tails = sources
  nodes.forEach((node) => {
    tails.forEach(({ id, label }) => edges.push(edge(id, node._id, label)))
    tails = isBranching(node) ? appendBranchEdges(node, edges) : [{ id: node._id, label: null }]
  })
  return tails
}

function appendBranchEdges(node: StepNode, edges: FlowEdge[]): Source[] {
  const labels = armLabels(node)
  return (['If', 'Else'] as const).flatMap((branch) =>
    appendEdges(node.children[branch], [{ id: node._id, label: labels[branch] }], edges),
  )
}

export function workflowEdges(actions: StepNode[] = []): FlowEdge[] {
  const edges: FlowEdge[] = []
  appendEdges(actions, [{ id: 'trigger', label: null }], edges)
  return edges
}

function tailIds(nodes: StepNode[], ids: Set<string> = new Set()): Set<string> {
  const tail = nodes[nodes.length - 1]
  if (tail) ids.add(tail._id)
  nodes.forEach((node) => {
    if (!isBranching(node)) return
    tailIds(node.children.If, ids)
    tailIds(node.children.Else, ids)
  })
  return ids
}

function openArms(node: StepNode) {
  if (!isBranching(node)) return null
  const labels = armLabels(node)
  return (['If', 'Else'] as const)
    .filter((arm) => !node.children[arm].length)
    .map((arm) => ({ branch: arm, label: labels[arm] }))
}

function parseParams(node: AnyRecord): AnyRecord {
  try {
    return JSON.parse(node.params || '{}')
  } catch {
    return {}
  }
}

function prettyEvent(event: string): string {
  const words = String(event).split('.').pop()?.replace(/_/g, ' ') ?? ''
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const SUMMARY_FIELDTYPES = ['Data', 'Select', 'Link', 'Int', 'Float', 'Currency', 'Percent']

function paramSummary(schema: AnyRecord | null, params: AnyRecord): string {
  return (schema?.params_schema || [])
    .filter((field: AnyRecord) => SUMMARY_FIELDTYPES.includes(field.fieldtype))
    .map((field: AnyRecord) => params[field.fieldname])
    .filter((value: unknown) => value !== undefined && value !== null && value !== '')
    .slice(0, 2)
    .join(', ')
}

function kickerFor(node: AnyRecord): string {
  if (node.step_type === 'If') return __('Condition')
  if (node.step_type === 'WaitForEvent') return __('Wait for')
  if (node.step_type === 'Wait') return __('Wait')
  return node.target && node.target !== 'trigger' ? __('Action on {0}', [node.target]) : __('Action')
}

function labelFor(node: AnyRecord): string {
  if (node.step_type === 'If') {
    return node.step_condition ? summarizeCondition(node.step_condition) : __('Set a condition')
  }
  if (node.step_type === 'Wait') {
    const { value, unit } = parseParams(node)
    return value ? __('Wait {0} {1}', [value, unit || 'Minutes']) : __('Pause the run')
  }
  if (node.step_type === 'WaitForEvent') {
    const { event_name: event } = parseParams(node)
    return event ? prettyEvent(event) : __('Pick an event')
  }
  if (!node.action_type) return __('Configure action')
  return actionSchema(null, node.action_type)?.label || node.action_type
}

function detailFor(node: AnyRecord): string {
  if (node.step_type !== 'Action' || !node.action_type) return ''
  return paramSummary(actionSchema(null, node.action_type), parseParams(node))
}

export function stepPresentation(node: AnyRecord) {
  return { ...stepIcon(node), kicker: kickerFor(node), label: labelFor(node), detail: detailFor(node) }
}

export function workflowNodes(doc: AnyRecord, errors: Record<string, unknown[]> = {}) {
  const actions: StepNode[] = doc.actions || []
  const tails = tailIds(actions)
  const trigger = triggerDefinition(doc)
  const triggerNode = {
    id: 'trigger',
    type: 'automation',
    position: { x: 0, y: 0 },
    data: {
      ...TRIGGER_STYLE,
      ...(trigger || {}),
      isTrigger: true,
      empty: !doc.trigger_type,
      kicker: __('Trigger'),
      label: trigger?.label || __('Start from scratch'),
      detail: doc.trigger_type ? __('on {0}', [doc.document_type]) : __('Pick initial trigger'),
      incomplete: triggerIssue(doc),
    } as AnyRecord,
  }
  const stepNodes = layoutSteps(actions).map(({ node, position }) => {
    const arms = openArms(node)
    return {
      id: node._id,
      type: 'automation',
      position,
      data: {
        step: node,
        ...stepPresentation(node),
        branching: isBranching(node),
        arms,
        canContinue: isBranching(node) && tails.has(node._id) && !arms?.length,
        last: tails.has(node._id),
        error: Boolean(errors[node._id]?.length),
        incomplete: stepIssue(node),
      } as AnyRecord,
    }
  })
  return [triggerNode, ...stepNodes]
}
