import '../../styles/workflowBuilder.css'
import { useEffect, useEffectEvent, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Badge, Breadcrumbs, Button, Switch, TabButtons, TextInput, createDialog, toast } from '@/design-system'
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts'
import { useUndoHistory } from '@/shared/hooks/useUndoHistory'
import { aliasTargets, loadCapabilities } from '../../stores/workflowCapabilitiesStore'
import { blockGroups } from '../../utils/workflowBlocks'
import { workflowEdges, workflowNodes } from '../../utils/workflowGraph'
import {
  adoptRowKeys,
  insertAfter,
  layoutSteps,
  newStep,
  removeStep,
  stepsBefore,
  toRows,
  toTree,
  type StepNode,
} from '../../utils/workflowSteps'
import { triggerFromValue, triggerGroups } from '../../utils/workflowTriggers'
import { firstBlockingRow, hasValues, triggerIssue } from '../../utils/workflowValidation'
import { WorkflowAutomationInspector } from './WorkflowAutomationInspector'
import { WorkflowFlow } from './WorkflowFlow'
import { WorkflowTrialRun } from './WorkflowTrialRun'

type AnyRecord = Record<string, any>

export interface WorkflowAutomationBuilderProps {
  automationName: string
  onClose: () => void
  onSaved: (saved: AnyRecord) => void
  onDirtyChange: (dirty: boolean) => void
}

function defaultDoc(): AnyRecord {
  return {
    doctype: 'Automation Flow',
    title: '',
    document_type: 'CRM Lead',
    enabled: 0,
    trigger_type: '',
    trigger_field: '',
    from_value: '',
    to_value: '',
    custom_event: '',
    date_field: '',
    date_offset: 0,
    date_direction: 'Before',
    cron_expression: '',
    filters: '[]',
    condition: '',
    relationships: '[]',
    run_as: 'Automation User',
    automation_user: '',
    revalidate_on_run: 0,
    actions: [],
    stop_on_error: 1,
    throttle_per_minute: 0,
  }
}

function emptyTriggerState(): AnyRecord {
  return {
    trigger_type: '',
    trigger_field: '',
    from_value: '',
    to_value: '',
    custom_event: '',
    date_field: '',
    date_offset: 0,
    date_direction: 'Before',
    cron_expression: '',
    filters: '[]',
    condition: '',
    relationships: '[]',
    actions: [],
  }
}

function parseJson(value: unknown, fallback: any): any {
  if (!value) return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function stringify(value: unknown, fallback = '{}'): string {
  if (!value) return fallback
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function normalizeRow(row: AnyRecord): AnyRecord {
  return {
    ...row,
    step_type: row.step_type || 'Action',
    params: stringify(row.params),
    related_condition: stringify(row.related_condition, ''),
  }
}

function normalizedParams(row: AnyRecord): AnyRecord {
  const params = parseJson(row.params, {})
  if (row.action_type !== 'SetFieldValue') return params
  if (!hasValues(params.values)) delete params.values
  return params
}

function normalizedRelatedCondition(value: unknown): string | null {
  const condition = parseJson(value, null)
  if (!condition || Array.isArray(condition) || !condition.relationship) return null
  return JSON.stringify(condition)
}

function payloadOf(doc: AnyRecord): AnyRecord {
  const relationships = parseJson(doc.relationships, [])
  return {
    ...doc,
    title: doc.title || __('Untitled automation'),
    filters: JSON.stringify(parseJson(doc.filters, [])),
    relationships: JSON.stringify(Array.isArray(relationships) ? relationships : []),
    actions: toRows(doc.actions).map((row) => ({
      ...row,
      doctype: 'Automation Action',
      params: JSON.stringify(normalizedParams(row)),
      related_condition: normalizedRelatedCondition(row.related_condition),
    })),
  }
}

function cleanMessage(message: unknown): string {
  try {
    return JSON.parse(String(message)).message || String(message)
  } catch {
    return String(message || __('Could not save automation'))
  }
}

function errorMessage(error: any): string {
  const messages = error?.messages || error?._server_messages
  if (Array.isArray(messages) && messages.length) return cleanMessage(messages[0])
  return cleanMessage(error?.message || error)
}

const isKey = (event: KeyboardEvent, key: string) => event.key.toLowerCase() === key
const withModifier = (event: KeyboardEvent) => event.metaKey || event.ctrlKey
const isUndoKey = (event: KeyboardEvent) => withModifier(event) && !event.shiftKey && isKey(event, 'z')
const isRedoKey = (event: KeyboardEvent) =>
  withModifier(event) && (isKey(event, 'y') || (event.shiftKey && isKey(event, 'z')))

export function WorkflowAutomationBuilder({
  automationName,
  onClose,
  onSaved,
  onDirtyChange,
}: WorkflowAutomationBuilderProps) {
  const [doc, setDoc] = useState<AnyRecord>(defaultDoc)
  const [loading, setLoading] = useState(Boolean(automationName))
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'editor' | 'test'>('editor')
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('trigger')
  const [errors, setErrors] = useState<Record<string, AnyRecord[]>>({})
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(payloadOf(defaultDoc())))
  const [revision, setRevision] = useState(0)

  const actions: StepNode[] = doc.actions
  const placed = layoutSteps(actions)
  const selectedStep = placed.find((item) => item.node._id === selectedId)?.node ?? null
  const relationships = parseJson(doc.relationships, [])
  const flowTargets = aliasTargets(doc.document_type, relationships, toRows(actions))
  const targetKey = flowTargets.map((target) => target.doctype ?? '').join('|')
  const showInspector = tab === 'editor' && inspectorOpen
  const canDeleteSelected = selectedId === 'trigger' ? Boolean(doc.trigger_type) : Boolean(selectedStep)
  const dirty = savedSnapshot !== JSON.stringify(payloadOf(doc))
  const canTest = Boolean(automationName) && !dirty

  const history = useUndoHistory(
    doc,
    (snapshot) => {
      setDoc((current) => ({ ...current, ...snapshot }))
      setErrors({})
      setSelectedId((current) => {
        if (current === 'trigger') return current
        return layoutSteps((snapshot.actions ?? []) as StepNode[]).some((item) => item.node._id === current)
          ? current
          : 'trigger'
      })
    },
    { ignore: ['enabled', 'name', 'creation', 'owner', 'modified'] },
  )

  const resetHistory = useEffectEvent(() => history.reset())
  const loadTargets = useEffectEvent(() => flowTargets.forEach((target) => void loadCapabilities(target.doctype)))
  const notifyDirty = useEffectEvent((value: boolean) => onDirtyChange(value))

  useEffect(() => {
    if (revision) resetHistory()
  }, [revision])

  useEffect(() => {
    loadTargets()
  }, [targetKey])

  useEffect(() => {
    notifyDirty(dirty)
  }, [dirty])

  useEffect(() => {
    if (!automationName) return
    let cancelled = false
    void rpc<AnyRecord>({ url: 'frappe.client.get', params: { doctype: 'Automation Flow', name: automationName } })
      .then((saved) => {
        if (cancelled) return
        const loaded = { ...saved, actions: toTree((saved.actions || []).map(normalizeRow)) }
        setDoc((current) => ({ ...current, ...loaded }))
        setSavedSnapshot(JSON.stringify(payloadOf({ ...defaultDoc(), ...loaded })))
        setRevision((current) => current + 1)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [automationName])

  function update(mutate: (draft: AnyRecord) => void) {
    setDoc((current) => {
      const draft = structuredClone(current)
      mutate(draft)
      return draft
    })
  }

  function findNode(draft: AnyRecord, id: string): StepNode | undefined {
    return layoutSteps(draft.actions).find((item) => item.node._id === id)?.node
  }

  function patchDoc(values: AnyRecord) {
    update((draft) => Object.assign(draft, values))
  }

  function patchStep(patch: Partial<StepNode>) {
    if (!selectedStep) return
    const id = selectedStep._id
    update((draft) => {
      const node = findNode(draft, id)
      if (node) Object.assign(node, patch)
    })
  }

  function addStep({ after, branch, values }: { after: AnyRecord | null; branch: string | null; values: AnyRecord }) {
    const created = newStep(values)
    update((draft) => {
      if (!after) draft.actions.push(created)
      else {
        const anchor = findNode(draft, after._id)
        if (!anchor) return
        if (branch) anchor.children[branch as 'If' | 'Else'].push(created)
        else insertAfter(draft.actions, anchor, created)
      }
    })
    setSelectedId(created._id)
    setInspectorOpen(true)
  }

  function selectNode(id: string) {
    setSelectedId(id)
    if (id !== 'trigger' || doc.trigger_type) setInspectorOpen(true)
  }

  function pickTrigger(value: string) {
    patchDoc(triggerFromValue(value))
    setSelectedId('trigger')
    setInspectorOpen(true)
  }

  function confirmSelectedRemoval() {
    if (!canDeleteSelected) return
    const deletingTrigger = selectedId === 'trigger'
    createDialog({
      title: deletingTrigger ? __('Delete trigger') : __('Delete step'),
      size: 'sm',
      message: deletingTrigger
        ? __('Are you sure you want to delete the trigger and all workflow steps?')
        : __('Are you sure you want to delete this step?'),
      actions: [
        { label: __('Cancel') },
        {
          label: __('Delete'),
          variant: 'solid',
          theme: 'red',
          onClick: ({ close }: { close: () => void }) => {
            if (deletingTrigger) {
              patchDoc(emptyTriggerState())
              setSelectedId('trigger')
              setInspectorOpen(false)
            } else if (selectedStep) {
              const id = selectedStep._id
              update((draft) => {
                removeStep(draft.actions, id)
              })
              setSelectedId('trigger')
            }
            close()
          },
        },
      ],
    } as never)
  }

  useKeyboardShortcuts({
    shortcuts: [
      { keys: ['Backspace', 'Delete'], guard: () => canDeleteSelected, action: confirmSelectedRemoval },
      { match: isUndoKey, action: history.undo },
      { match: isRedoKey, action: history.redo },
    ],
  })

  function attachRowError(rowIndex: number, message: string) {
    const node = placed[rowIndex - 1]?.node
    if (!node) return
    setErrors({ [node._id]: [{ message }] })
    setSelectedId(node._id)
  }

  function attachError(error: unknown): string {
    const raw = errorMessage(error)
    const match = raw.match(/^Row (\d+):\s*/)
    const message = match ? raw.slice(match[0].length) : raw
    if (match) attachRowError(Number(match[1]), message)
    else if (selectedStep) setErrors({ [selectedStep._id]: [{ message }] })
    return message
  }

  async function saveAutomation() {
    history.flush()
    setSaving(true)
    setErrors({})
    try {
      const trigger = triggerIssue(doc)
      if (trigger) throw new Error(trigger)
      const blocking = firstBlockingRow(doc.actions)
      if (blocking) {
        attachRowError(blocking.row.idx, blocking.issue)
        throw new Error(blocking.issue)
      }
      const payload = payloadOf(doc)
      const saved = await rpc<AnyRecord>({
        url: automationName ? 'frappe.client.save' : 'frappe.client.insert',
        params: { doc: payload },
      })
      const nextDoc = structuredClone(doc)
      nextDoc.name = saved.name
      nextDoc.creation = saved.creation
      nextDoc.owner = saved.owner
      nextDoc.modified = saved.modified
      adoptRowKeys(nextDoc.actions, saved.actions || [])
      setDoc(nextDoc)
      setSavedSnapshot(JSON.stringify(payloadOf(nextDoc)))
      history.absorb()
      toast.success(__('Automation saved'))
      onSaved(saved)
    } catch (error) {
      toast.error(attachError(error))
    } finally {
      setSaving(false)
    }
  }

  const nodes = workflowNodes(doc, errors)
  const edges = workflowEdges(actions)

  return (
    <div className="flex h-full min-h-0 bg-surface-base p-2">
      <div className="automation-card flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-gray-1 shadow-sm ring-1 ring-outline-gray-1">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-outline-gray-2 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Breadcrumbs
              className="automation-breadcrumbs"
              items={[{ label: __('Workflow Automation'), onClick: onClose }]}
              prefix={() => <span className="lucide-workflow mr-1.5 size-4 text-ink-gray-5" aria-hidden="true" />}
            />
            <span className="text-sm-semibold text-ink-gray-5" aria-hidden="true">
              /
            </span>
            <div className="flex min-w-0 cursor-text items-center gap-1 rounded pr-1.5 transition-colors hover:bg-surface-gray-2">
              <div
                className="title-sizer -mr-2.5 font-semibold text-ink-gray-7"
                data-value={doc.title || __('Untitled automation')}
              >
                <TextInput
                  variant="ghost"
                  value={doc.title}
                  aria-label={__('Automation title')}
                  placeholder={__('Untitled automation')}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(value: string) => patchDoc({ title: value })}
                />
              </div>
            </div>
            <span className="-ml-1.5 select-none text-ink-red-6" aria-hidden="true">
              *
            </span>
            <span className="sr-only">{__('(required)')}</span>
          </div>
          <div className="flex items-center gap-2">
            {dirty && <Badge size="md" label={__('Unsaved')} theme="amber" variant="subtle" />}
            <Button
              label={__('Save')}
              variant="solid"
              loading={saving}
              disabled={!dirty}
              onClick={() => void saveAutomation()}
            />
            <Button icon="lucide-x" variant="ghost" aria-label={__('Close')} onClick={onClose} />
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between border-b border-outline-gray-2 px-4 py-2">
          <TabButtons
            value={tab}
            onChange={(value) => setTab(value === 'test' ? 'test' : 'editor')}
            options={[
              { label: __('Editor'), value: 'editor' },
              { label: __('Test Run'), value: 'test' },
            ]}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-gray-6">{__('Enabled')}</span>
            <Switch
              size="sm"
              value={Boolean(doc.enabled)}
              disabled={!doc.trigger_type}
              onChange={(value) => patchDoc({ enabled: value ? 1 : 0 })}
            />
          </div>
        </div>
        {tab === 'test' ? (
          <div className="min-h-0 flex-1 p-4">
            {canTest ? (
              <WorkflowTrialRun automationName={automationName} doc={doc} />
            ) : (
              <p className="text-sm text-ink-gray-5">{__('Save the flow before testing it.')}</p>
            )}
          </div>
        ) : (
          <div className="relative min-h-0 flex-1 outline-none" tabIndex={0}>
            <WorkflowFlow
              nodes={nodes}
              edges={edges}
              blockGroups={blockGroups(doc.document_type)}
              triggerGroups={triggerGroups(doc.document_type)}
              selectedId={selectedId}
              dimUnselected={showInspector}
              canDelete={canDeleteSelected}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              onSelect={selectNode}
              onAddStep={addStep}
              onPickTrigger={pickTrigger}
              onRequestRemove={confirmSelectedRemoval}
              onUndo={history.undo}
              onRedo={history.redo}
            />
            {doc.trigger_type && (
              <Button
                className="absolute right-3 top-3 z-10 shadow-sm transition-transform active:scale-95"
                variant="subtle"
                aria-label={inspectorOpen ? __('Close inspector') : __('Open inspector')}
                aria-expanded={inspectorOpen}
                onClick={() => setInspectorOpen((current) => !current)}
              >
                <span
                  className={`lucide-chevrons-left size-4 transition-transform duration-200 ease-out ${inspectorOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </Button>
            )}
          </div>
        )}
      </div>
      <div
        className={`min-h-0 shrink-0 overflow-hidden transition-[width,margin,opacity] duration-200 ease-out motion-reduce:transition-none ${showInspector ? 'ml-2 w-[340px]' : 'ml-0 w-0 opacity-0'}`}
        aria-hidden={!showInspector}
        inert={!showInspector}
      >
        <div className="automation-card h-full w-[340px] overflow-hidden rounded-lg bg-surface-base">
          <WorkflowAutomationInspector
            doc={doc}
            selectedStep={selectedStep}
            targets={
              selectedStep ? aliasTargets(doc.document_type, relationships, stepsBefore(actions, selectedStep)) : []
            }
            loading={loading}
            onUpdate={patchDoc}
            onStepChange={patchStep}
          />
        </div>
      </div>
    </div>
  )
}
