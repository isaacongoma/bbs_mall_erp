import { useEffect, useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Badge, Button } from '@/design-system'
import { Link } from '@/shared/components/Controls/Link'
import { workflowEdges, workflowNodes } from '../../utils/workflowGraph'
import { armLabels, isBranching, toRows, type StepNode } from '../../utils/workflowSteps'
import { WorkflowFlow } from './WorkflowFlow'

type AnyRecord = Record<string, any>

export interface WorkflowTrialRunProps {
  automationName: string
  doc: AnyRecord
}

const STATUS_THEMES: Record<string, string> = {
  Success: 'green',
  Skipped: 'gray',
  Waiting: 'blue',
  Failed: 'red',
  'Partially Failed': 'orange',
}

const WAIT_HOLD = 5000
const MIN_HOLD = 400
const MAX_HOLD = 1500

function plainText(message: unknown): string {
  const holder = document.createElement('div')
  holder.innerHTML = String(message || '')
  return (holder.textContent ?? '').trim()
}

function hold(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function holdFor(entry: AnyRecord): number {
  const type = entry.action_type
  if (type === 'Wait' || type === 'WaitForEvent') return WAIT_HOLD
  return Math.min(Math.max(entry.duration_ms || 0, MIN_HOLD), MAX_HOLD)
}

export function WorkflowTrialRun({ automationName, doc }: WorkflowTrialRunProps) {
  const [docname, setDocname] = useState('')
  const [running, setRunning] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [showFailures, setShowFailures] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<AnyRecord | null>(null)
  const [activeKey, setActiveKey] = useState('')
  const [outcomes, setOutcomes] = useState<Record<string, AnyRecord>>({})
  const [taken, setTaken] = useState<Record<string, string>>({})
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const result = useRef<AnyRecord | null>(null)
  const playToken = useRef(0)

  useEffect(
    () => () => {
      playToken.current += 1
    },
    [],
  )

  const actions: StepNode[] = doc.actions || []
  const finished = Boolean(summary) && !playing

  const rowIdx: Record<string, number> = {}
  toRows(actions).forEach((row) => {
    rowIdx[row.step_key] = row.idx
  })
  const branchIdx = (node: StepNode) => rowIdx[node._outcomeKey || node.step_key]

  const states = new Map<string, { node: StepNode; offPath: boolean }>()
  function walk(nodes: StepNode[], offPath: boolean) {
    nodes.forEach((node) => {
      states.set(node._id, { node, offPath })
      if (!isBranching(node)) return
      const chosen = taken[String(branchIdx(node))]
      ;(['If', 'Else'] as const).forEach((arm) =>
        walk(node.children[arm], offPath || Boolean(chosen && chosen !== arm)),
      )
    })
  }
  walk(actions, false)

  const stepKeys = new Set([...states.values()].map(({ node }) => node.step_key))
  const stepCount = states.size
  const ranCount = Object.keys(outcomes).filter((key) => stepKeys.has(key)).length
  const failures = Object.values(outcomes).filter((step) => step.status === 'Failed')

  function retryArms(step: StepNode) {
    const chosen = taken[String(branchIdx(step))]
    if (!isBranching(step) || !chosen || !finished) return []
    const labels = armLabels(step)
    return (['If', 'Else'] as const)
      .filter((arm) => arm !== chosen && step.children[arm].length)
      .map((arm) => ({ branch: arm, label: labels[arm], idx: branchIdx(step) }))
  }

  const nodes = workflowNodes(doc).map((node) => {
    if (node.data.isTrigger) return { ...node, data: { ...node.data, detail: docname || node.data.detail } }
    const step = node.data.step as StepNode
    const outcome = outcomes[step.step_key]
    return {
      ...node,
      data: {
        ...node.data,
        status: activeKey === step.step_key ? 'running' : outcome?.status,
        detail: outcome ? outcome.message || outcome.detail : node.data.detail,
        dimmed: states.get(node.id)?.offPath || (finished && !outcome),
        forced: Boolean(overrides[String(branchIdx(step))]),
        retryArms: retryArms(step),
      },
    }
  })

  const edges = workflowEdges(actions).map((edge) =>
    states.get(edge.target)?.offPath
      ? { ...edge, style: { ...edge.style, stroke: '#C7C7C7', strokeDasharray: '4 4' } }
      : edge,
  )

  function reveal(entry: AnyRecord, run: AnyRecord) {
    setOutcomes((current) => ({ ...current, [entry.step_key]: entry }))
    const branch = run.branches?.[String(entry.step_idx + 1)]
    if (branch) setTaken((current) => ({ ...current, [String(entry.step_idx + 1)]: branch }))
  }

  function reset() {
    playToken.current += 1
    setPlaying(false)
    setShowFailures(false)
    setActiveKey('')
    setSummary(null)
    result.current = null
    setOutcomes({})
    setTaken({})
  }

  async function playback(run: AnyRecord) {
    const token = ++playToken.current
    setSummary(run)
    setPlaying(true)
    for (const entry of run.steps || []) {
      if (stepKeys.has(entry.step_key)) {
        setActiveKey(entry.step_key)
        await hold(holdFor(entry))
        if (token !== playToken.current) return
      }
      reveal(entry, run)
    }
    setActiveKey('')
    setPlaying(false)
  }

  function finishPlayback() {
    playToken.current += 1
    const run = result.current
    ;(run?.steps || []).forEach((entry: AnyRecord) => reveal(entry, run as AnyRecord))
    setActiveKey('')
    setPlaying(false)
  }

  async function run(branchOverrides: Record<string, string> | null = null) {
    reset()
    const active = branchOverrides ?? {}
    if (!branchOverrides) setOverrides({})
    setRunning(true)
    setError('')
    try {
      const response = await rpc<AnyRecord>({
        url: 'frappe.automation_engine.api.trial_run',
        params: { automation: automationName, docname: docname || null, branch_overrides: active },
      })
      result.current = response
      await playback(response)
    } catch (failure) {
      const e = failure as AnyRecord
      setError(plainText(e?.messages?.join?.('\n') || e?.message))
    } finally {
      setRunning(false)
    }
  }

  function runBranch(arm: AnyRecord) {
    const next = { ...overrides, [String(arm.idx)]: arm.branch }
    setOverrides(next)
    void run(next)
  }

  const stepLabel = (step: AnyRecord) => (step.step_key === 'setup' ? __('Before the first step') : step.step_key)
  const traceOf = (step: AnyRecord) => step.traceback || (step.message ? '' : step.detail)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          {doc.document_type && (
            <Link
              className="max-w-sm"
              variant="outline"
              value={docname}
              doctype={doc.document_type}
              label={__('Select a record')}
              placeholder={__('Pick a {0}', [doc.document_type])}
              onChange={(value) => {
                setDocname(value)
                reset()
              }}
            />
          )}
        </div>
        {playing && <Button label={__('Skip')} variant="subtle" onClick={finishPlayback} />}
        <Button
          label={__('Start test run')}
          variant="solid"
          iconLeft="lucide-play"
          loading={running}
          disabled={Boolean(doc.document_type && !docname)}
          onClick={() => void run()}
        />
      </div>

      {error && (
        <div className="text-sm text-ink-red-5" role="alert">
          {error}
        </div>
      )}

      {summary && (
        <div className="flex items-center gap-2 rounded-lg border border-outline-gray-2 bg-surface-gray-1 px-3 py-2">
          <Badge
            label={playing ? __('Running') : __(summary.status)}
            theme={(playing ? 'blue' : STATUS_THEMES[summary.status] || 'gray') as never}
            variant="subtle"
          />
          <span className="shrink-0 text-sm text-ink-gray-6">{__('{0} of {1} steps ran', [ranCount, stepCount])}</span>
          {summary.error_summary && <span className="truncate text-sm text-ink-red-5">{summary.error_summary}</span>}
          {failures.length > 0 && (
            <Button
              className="ml-auto shrink-0"
              variant="ghost"
              size="sm"
              label={showFailures ? __('Hide details') : __('Show details')}
              onClick={() => setShowFailures((current) => !current)}
            />
          )}
        </div>
      )}

      {showFailures && failures.length > 0 && (
        <div className="max-h-40 shrink-0 space-y-2 overflow-y-auto rounded-lg border border-outline-red-2 p-3">
          {failures.map((step) => (
            <div key={step.step_key} className="space-y-1">
              <div className="text-sm-medium text-ink-gray-8">{stepLabel(step)}</div>
              {step.message && <div className="text-xs text-ink-red-5">{step.message}</div>}
              {traceOf(step) && <pre className="overflow-x-auto text-xs text-ink-gray-6">{traceOf(step)}</pre>}
            </div>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-outline-gray-2">
        <WorkflowFlow nodes={nodes} edges={edges} readonly onRunBranch={runBranch} />
      </div>
    </div>
  )
}
