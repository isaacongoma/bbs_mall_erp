import { create } from 'zustand'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'

type AnyRecord = Record<string, any>

export interface AliasTarget {
  alias: string
  doctype: string | null
  label: string
  choices?: string[]
}

interface CapabilitiesState {
  cache: Record<string, AnyRecord>
}

export const useWorkflowCapabilities = create<CapabilitiesState>(() => ({ cache: {} }))

const pending = new Set<string>()

const OFFERED_PARAMS: Record<string, string[]> = { RunScript: ['server_script'] }

function offeredParams(action: AnyRecord): AnyRecord {
  const offered = OFFERED_PARAMS[action.action_type]
  if (!offered) return action
  return {
    ...action,
    params_schema: (action.params_schema || []).filter((param: AnyRecord) => offered.includes(param.fieldname)),
  }
}

function offeredHere(capabilities: AnyRecord): AnyRecord {
  return { ...capabilities, actions: (capabilities.actions || []).map(offeredParams) }
}

export function capabilitiesFor(doctype?: string | null): AnyRecord | null {
  return doctype ? (useWorkflowCapabilities.getState().cache[doctype] ?? null) : null
}

export async function loadCapabilities(doctype?: string | null): Promise<void> {
  if (!doctype || useWorkflowCapabilities.getState().cache[doctype] || pending.has(doctype)) return
  pending.add(doctype)
  try {
    const capabilities = await rpc<AnyRecord>({
      url: 'frappe.automation_engine.api.get_automation_capabilities',
      params: { doctype },
    })
    useWorkflowCapabilities.setState((state) => ({ cache: { ...state.cache, [doctype]: offeredHere(capabilities) } }))
  } finally {
    pending.delete(doctype)
  }
}

export function relationshipDefinition(
  doctype: string | null | undefined,
  relationship: string,
): AnyRecord | undefined {
  return (capabilitiesFor(doctype)?.relationships || []).find((item: AnyRecord) => item.name === relationship)
}

function anyActionSchema(actionType: string): AnyRecord | null {
  for (const capabilities of Object.values(useWorkflowCapabilities.getState().cache)) {
    const match = (capabilities.actions || []).find((action: AnyRecord) => action.action_type === actionType)
    if (match) return match
  }
  return null
}

export function actionSchema(doctype: string | null | undefined, actionType?: string): AnyRecord | null {
  if (!actionType) return null
  const scoped = (capabilitiesFor(doctype)?.actions || []).find(
    (action: AnyRecord) => action.action_type === actionType,
  )
  return scoped || anyActionSchema(actionType)
}

export function stepParams(step: AnyRecord): AnyRecord {
  try {
    return JSON.parse(step.params || '{}')
  } catch {
    return {}
  }
}

function resolvedTarget(definition?: AnyRecord): string | null {
  if (definition?.target_doctype) return definition.target_doctype
  const choices = definition?.target_doctypes || []
  return choices.length === 1 ? choices[0] : null
}

function addRelationshipAlias(targets: AliasTarget[], item: AnyRecord) {
  if (!item.alias || !item.relationship) return
  const source = targets.find((target) => target.alias === (item.source || 'trigger'))
  const definition = relationshipDefinition(source?.doctype, item.relationship)
  targets.push({
    alias: item.alias,
    doctype: item.target_doctype || resolvedTarget(definition),
    label: definition?.label || item.relationship,
    choices: definition?.target_doctypes || [],
  })
}

function addOutputAlias(targets: AliasTarget[], step: AnyRecord) {
  if (!step.output_alias) return
  const action = actionSchema(null, step.action_type)
  const declared = action?.output_schema?.destination_reference?.doctype
  targets.push({
    alias: step.output_alias,
    doctype: (declared === 'Dynamic' ? stepParams(step).doctype : declared) || null,
    label: __('Output of {0}', [step.step_key || action?.label || step.action_type]),
  })
}

export function aliasTargets(
  documentType: string,
  relationships: AnyRecord[] = [],
  earlierSteps: AnyRecord[] = [],
): AliasTarget[] {
  const targets: AliasTarget[] = [{ alias: 'trigger', doctype: documentType, label: __('Trigger record') }]
  relationships.forEach((item) => addRelationshipAlias(targets, item))
  earlierSteps.forEach((step) => addOutputAlias(targets, step))
  return targets
}
