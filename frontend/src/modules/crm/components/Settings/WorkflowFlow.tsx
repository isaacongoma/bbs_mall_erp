import '@xyflow/react/dist/style.css'
import '../../styles/workflowFlow.css'
import {
  Background,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { __ } from '@/core/i18n'
import { Badge, Button, Combobox, Spinner, Tooltip, cn } from '@/design-system'
import type { BlockGroup } from '../../utils/workflowBlocks'
import type { FlowEdge } from '../../utils/workflowGraph'
import { WorkflowComboboxIcon, WorkflowComboboxOption } from './WorkflowComboboxParts'

type AnyRecord = Record<string, any>

export interface WorkflowFlowProps {
  nodes: AnyRecord[]
  edges: FlowEdge[]
  blockGroups?: BlockGroup[]
  triggerGroups?: { group: string; options: AnyRecord[] }[]
  selectedId?: string
  dimUnselected?: boolean
  canDelete?: boolean
  canUndo?: boolean
  canRedo?: boolean
  readonly?: boolean
  onSelect?: (id: string) => void
  onAddStep?: (payload: { after: AnyRecord | null; branch: string | null; values: AnyRecord }) => void
  onPickTrigger?: (value: string) => void
  onRequestRemove?: () => void
  onRunBranch?: (arm: AnyRecord) => void
  onUndo?: () => void
  onRedo?: () => void
}

const EDGE_PADDING = 48

const RUN_ICONS: Record<string, string> = {
  Success: 'lucide-circle-check',
  Skipped: 'lucide-circle-minus',
  Failed: 'lucide-circle-x',
  Waiting: 'lucide-clock',
}

const RUN_COLORS: Record<string, string> = {
  Success: 'text-ink-green-5',
  Skipped: 'text-ink-gray-4',
  Failed: 'text-ink-red-5',
  Waiting: 'text-ink-amber-6',
}

interface FlowContextValue {
  props: WorkflowFlowProps
  blocksByValue: Map<string, AnyRecord>
}

const FlowContext = createContext<FlowContextValue | null>(null)

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

function BlockCombobox({
  groups,
  side = 'right',
  trigger,
  onPick,
}: {
  groups: BlockGroup[]
  side?: 'right' | 'bottom'
  trigger: (api: { open: boolean; toggle: () => void }) => React.ReactNode
  onPick: (value: string) => void
}) {
  return (
    <Combobox
      options={groups as never}
      value={null}
      trigger={({ open, setOpen }) => trigger({ open, toggle: () => setOpen(!open) })}
      side={side}
      placeholder={__('Search blocks')}
      onChange={(value) => value && onPick(String(value))}
      itemPrefix={({ item }) => <WorkflowComboboxIcon item={item as AnyRecord} />}
      itemLabel={({ item }) => <WorkflowComboboxOption item={item as AnyRecord} />}
    />
  )
}

function AutomationNode({ id, data }: NodeProps<Node<AnyRecord>>) {
  const context = useContext(FlowContext)
  if (!context) return null
  const { props, blocksByValue } = context
  const readonly = Boolean(props.readonly)
  const blockGroups = props.blockGroups ?? []
  const picksTrigger = Boolean(data.empty) && !readonly

  const faded =
    data.dimmed || (props.dimUnselected && !data.empty && Boolean(props.selectedId) && props.selectedId !== id)
  const isOn = !readonly && props.selectedId === id

  function surface(): string {
    if (data.empty) return 'border-dashed border-outline-gray-3 shadow-none'
    if (data.status === 'Failed') return 'border-outline-red-2 bg-surface-modal shadow-sm'
    if (data.status === 'running') return 'border-outline-gray-5 shadow-md'
    if (data.error) return 'border-outline-red-2 bg-surface-modal shadow-sm'
    if (isOn) return 'border-outline-gray-8 shadow-sm shadow-surface-base'
    if (data.incomplete) return 'border-outline-amber-2 shadow-md hover:border-outline-gray-8'
    return 'border-outline-gray-2 shadow-md hover:border-outline-gray-8'
  }

  const hasOutgoing = props.edges.some((edge) => edge.source === id)
  const showAdd =
    readonly || data.branching || data.empty ? false : data.isTrigger ? props.nodes.length === 1 : data.last

  function select() {
    if (!readonly) props.onSelect?.(id)
  }

  function addBlock(branch: string | null, value: string) {
    const block = blocksByValue.get(value)
    if (!block) return
    props.onAddStep?.({ after: data.step || null, branch, values: block.values })
  }

  function card(toggle: () => void) {
    return (
      <div
        className={cn(
          'workflow-node relative flex h-[87px] w-[212px] flex-col overflow-hidden rounded-[10px] border bg-surface-base shadow-sm transition-all',
          picksTrigger && 'nodrag',
          surface(),
          faded && 'opacity-40',
        )}
        tabIndex={readonly ? -1 : 0}
        role={readonly ? undefined : 'button'}
        aria-label={`${data.kicker}: ${data.label}`}
        onClick={(event) => {
          event.stopPropagation()
          select()
          if (picksTrigger) toggle()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') select()
          if (event.key === ' ') {
            event.preventDefault()
            select()
          }
        }}
      >
        <div className="flex h-[47px] shrink-0 items-center gap-1.5 border-b border-outline-gray-3 px-2">
          {!data.empty && (
            <div
              className={cn('flex size-[30px] shrink-0 items-center justify-center rounded-[6px] border', data.chip)}
            >
              <span className={cn(data.icon, 'workflow-node-icon size-5', data.tone)} aria-hidden="true" />
            </div>
          )}
          <div
            className={cn(
              'min-w-0 flex-1 truncate text-[11px] font-medium leading-[13px] text-ink-gray-9',
              data.empty && 'text-center',
            )}
          >
            {data.label}
          </div>
          {data.forced && <Badge label={__('Forced')} theme="orange" variant="subtle" />}
          {data.status === 'running' ? (
            <Spinner size="sm" className="shrink-0 text-ink-gray-7" />
          ) : RUN_ICONS[data.status] ? (
            <span
              className={cn(RUN_ICONS[data.status], 'size-4 shrink-0', RUN_COLORS[data.status])}
              aria-hidden="true"
            />
          ) : data.error ? (
            <span className="lucide-circle-alert size-4 shrink-0 text-ink-red-4" aria-hidden="true" />
          ) : data.incomplete ? (
            <Tooltip text={data.incomplete}>
              <span className="lucide-triangle-alert size-4 shrink-0 text-ink-amber-6" aria-hidden="true" />
            </Tooltip>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-1 items-end gap-2 px-2 py-[7px]">
          <div className="line-clamp-2 min-w-0 flex-1 text-[10px] leading-3 text-ink-gray-7">{data.detail || null}</div>
          <div className="shrink-0 text-[10px] font-medium leading-3 text-ink-gray-8">{data.kicker}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center">
        <div className="relative w-[212px] shrink-0">
          {!data.isTrigger && <Handle id="input" className="workflow-port" type="target" position={Position.Left} />}
          <Combobox
            options={(props.triggerGroups ?? []) as never}
            value={null}
            disabled={!picksTrigger}
            trigger={({ setOpen, open }) => card(() => setOpen(!open))}
            placeholder={__('Search triggers')}
            onChange={(value) => value && props.onPickTrigger?.(String(value))}
            itemPrefix={({ item }) => <WorkflowComboboxIcon item={item as AnyRecord} />}
            itemLabel={({ item }) => <WorkflowComboboxOption item={item as AnyRecord} />}
          />
          {hasOutgoing && <Handle id="output" className="workflow-port" type="source" position={Position.Right} />}
        </div>
        {showAdd && (
          <div className="workflow-add-control nodrag flex items-center" onClick={(event) => event.stopPropagation()}>
            <span className="h-px w-5 bg-outline-gray-3" />
            <BlockCombobox
              groups={blockGroups}
              onPick={(value) => addBlock(null, value)}
              trigger={({ toggle }) => (
                <Button icon="lucide-plus" variant="ghost" aria-label={__('Add block')} onClick={toggle} />
              )}
            />
          </div>
        )}
      </div>
      {data.retryArms?.length > 0 && (
        <div
          className="workflow-add-control nodrag absolute left-0 top-[calc(100%+8px)] flex gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          {data.retryArms.map((arm: AnyRecord) => (
            <Button key={arm.branch} size="sm" iconLeft="lucide-play" onClick={() => props.onRunBranch?.(arm)}>
              {__('Run {0}', [arm.label])}
            </Button>
          ))}
        </div>
      )}
      {(data.arms?.length > 0 || data.canContinue) && !readonly && (
        <div
          className="workflow-add-control nodrag absolute left-[calc(100%+12px)] top-1/2 flex -translate-y-1/2 flex-col gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          {(data.arms ?? []).map((arm: AnyRecord) => (
            <BlockCombobox
              key={arm.branch}
              groups={blockGroups}
              onPick={(value) => addBlock(arm.branch, value)}
              trigger={({ toggle }) => (
                <Button
                  iconLeft="lucide-plus"
                  size="sm"
                  className={arm.branch === 'Else' ? 'mt-2' : ''}
                  onClick={toggle}
                >
                  {arm.label}
                </Button>
              )}
            />
          ))}
          {data.canContinue && (
            <BlockCombobox
              groups={blockGroups}
              onPick={(value) => addBlock(null, value)}
              trigger={({ toggle }) => (
                <Button iconLeft="lucide-plus" size="sm" className="ml-6" onClick={toggle}>
                  {__('After branches')}
                </Button>
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}

const nodeTypes = { automation: AutomationNode }

function FlowCanvas(props: WorkflowFlowProps) {
  const { fitView, setViewport, getViewport, zoomIn, zoomOut } = useReactFlow()
  const viewport = useViewport()
  const root = useRef<HTMLDivElement | null>(null)
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({})
  const readonly = Boolean(props.readonly)
  const isBlank = props.nodes.length === 1 && Boolean(props.nodes[0]?.data?.empty)
  const maxZoom = isBlank ? 1.1 : props.nodes.length <= 3 ? 1.25 : 1
  const signature = props.nodes.map((node) => node.id).join('|')
  const empty = props.nodes[0]?.data?.empty
  const previousEmpty = useRef<unknown>(empty)
  const latest = useRef({ props, maxZoom, moved })
  const refitRef = useRef<(animateLeft?: boolean) => Promise<void>>(async () => undefined)

  useEffect(() => {
    latest.current = { props, maxZoom, moved }
    refitRef.current = refit
  })

  const flowNodes = props.nodes.map((node) => ({ ...node, position: moved[node.id] || node.position })) as Node[]
  const blocksByValue = new Map<string, AnyRecord>(
    (props.blockGroups ?? []).flatMap((group) => group.options.map((option) => [option.value, option] as const)),
  )

  async function alignLeft(zoom = getViewport().zoom) {
    const { moved: positions, props: current } = latest.current
    const leftmost = Math.min(...current.nodes.map((node) => (positions[node.id] || node.position).x))
    await setViewport({ ...getViewport(), zoom, x: EDGE_PADDING - leftmost * zoom }, { duration: 0 })
  }

  async function keepAddControlsVisible() {
    const canvas = root.current?.getBoundingClientRect()
    const controls = root.current?.querySelectorAll('.workflow-add-control') ?? []
    if (!canvas || !controls.length) return
    const right = Math.max(...[...controls].map((item) => item.getBoundingClientRect().right))
    const used = right - canvas.left - EDGE_PADDING
    const available = canvas.width - EDGE_PADDING * 2
    if (used <= available || used <= 0) return
    await alignLeft(Math.max(getViewport().zoom * (available / used), 0.3))
  }

  async function centerEmpty() {
    const canvas = root.current?.getBoundingClientRect()
    const node = root.current?.querySelector('.react-flow__node')?.getBoundingClientRect()
    if (!canvas || !node) return
    const view = getViewport()
    await setViewport(
      {
        ...view,
        x: view.x + (canvas.left + canvas.width / 2 - node.left - node.width / 2),
        y: view.y + (canvas.top + canvas.height * 0.3 - node.top - node.height / 2),
      },
      { duration: 0 },
    )
  }

  async function refit(animateLeft = false) {
    await nextFrame()
    await nextFrame()
    const { props: current, maxZoom: zoomCap } = latest.current
    if (animateLeft) {
      const { moved: positions } = latest.current
      const leftmost = Math.min(...current.nodes.map((node) => (positions[node.id] || node.position).x))
      const zoom = getViewport().zoom
      await setViewport({ ...getViewport(), zoom, x: EDGE_PADDING - leftmost * zoom }, { duration: 200 })
      return
    }
    await fitView({ padding: 0.08, minZoom: 0.3, maxZoom: zoomCap, duration: 0 })
    if (current.nodes[0]?.data?.empty) {
      await centerEmpty()
      return
    }
    await alignLeft()
    await nextFrame()
    await keepAddControlsVisible()
  }

  useEffect(() => {
    const animateLeft = previousEmpty.current === true && empty === false
    previousEmpty.current = empty
    void refitRef.current(animateLeft)
  }, [signature, empty])

  useEffect(() => {
    const element = root.current
    if (!element) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const observer = new ResizeObserver((entries) => {
      if (!entries[0]?.contentRect.width) return
      clearTimeout(timer)
      timer = setTimeout(() => void refitRef.current(), 80)
    })
    observer.observe(element)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  const edges = props.edges.map(({ type: _type, ...edge }) => edge) as Edge[]

  return (
    <FlowContext.Provider value={{ props, blocksByValue }}>
      <div ref={root} className="h-full w-full">
        <ReactFlow
          className="workflow-flow"
          nodes={flowNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={!readonly}
          nodesConnectable={false}
          elementsSelectable={!readonly}
          panOnDrag
          proOptions={{ hideAttribution: true }}
          minZoom={0.1}
          onNodeDragStop={(_event, node) => setMoved((current) => ({ ...current, [node.id]: { ...node.position } }))}
          onNodeClick={(_event, node) => !readonly && props.onSelect?.(node.id)}
          onPaneClick={() => !readonly && props.onSelect?.('trigger')}
        >
          <Background color="var(--surface-gray-4)" gap={20} size={3} />
          <Panel position="bottom-center">
            <div className="flex items-center gap-0.5 rounded-[10px] border border-outline-gray-2 bg-surface-gray-1 p-1 shadow-md">
              {!readonly && (
                <>
                  <Button
                    icon="lucide-undo-2"
                    variant="ghost"
                    disabled={!props.canUndo}
                    aria-label={__('Undo')}
                    onClick={props.onUndo}
                  />
                  <Button
                    icon="lucide-redo-2"
                    variant="ghost"
                    disabled={!props.canRedo}
                    aria-label={__('Redo')}
                    onClick={props.onRedo}
                  />
                  <span className="mx-1 h-5 w-px border-l border-outline-gray-2" aria-hidden="true" />
                </>
              )}
              <Button
                icon="lucide-minus"
                variant="ghost"
                aria-label={__('Zoom out')}
                onClick={() => void zoomOut({ duration: 150 })}
              />
              <span className="min-w-11 text-center text-xs font-medium tabular-nums text-ink-gray-7">
                {`${Math.round(viewport.zoom * 100)}%`}
              </span>
              <Button
                icon="lucide-plus"
                variant="ghost"
                aria-label={__('Zoom in')}
                onClick={() => void zoomIn({ duration: 150 })}
              />
              <span className="mx-1 h-5 w-px border-l border-outline-gray-2" aria-hidden="true" />
              <Button
                icon="lucide-maximize"
                variant="ghost"
                aria-label={__('Fit entire flow')}
                onClick={() => void refit()}
              />
              {props.canDelete && (
                <Button
                  icon="lucide-trash-2"
                  variant="ghost"
                  className="text-ink-red-6"
                  aria-label={props.selectedId === 'trigger' ? __('Remove trigger') : __('Remove step')}
                  onClick={(event) => {
                    event.stopPropagation()
                    props.onRequestRemove?.()
                  }}
                />
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </FlowContext.Provider>
  )
}

export function WorkflowFlow(props: WorkflowFlowProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  )
}
