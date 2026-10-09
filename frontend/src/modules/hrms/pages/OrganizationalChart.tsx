import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Button, ErrorMessage, FormControl, Spinner, usePageMeta } from '@/design-system'
import { LayoutHeader } from '@/shared/components/LayoutHeader'
import { buildHierarchy, type HierarchyNode } from '../utils/organizationalChart'

interface HierarchyGroup {
  parent?: string
  data?: HierarchyNode[]
}

function unwrap(value: unknown): unknown {
  if (value && typeof value === 'object' && 'message' in (value as object)) return (value as Record<string, unknown>).message
  return value
}

export default function OrganizationalChart() {
  const navigate = useNavigate()
  const [company, setCompany] = useState('All Companies')
  const [requestedCompany, setRequestedCompany] = useState('All Companies')
  const chart = useResource<HierarchyGroup[]>({
    url: 'hrms.utils.hierarchy_chart.get_all_nodes',
    params: {
      method: 'hrms.hr.page.organizational_chart.organizational_chart.get_children',
      company: requestedCompany,
    },
    cache: ['hrms-organizational-chart', requestedCompany],
    auto: true,
    initialData: [],
    transform: (value) => {
      const data = unwrap(value)
      return Array.isArray(data) ? data as HierarchyGroup[] : []
    },
  })
  const hierarchy = useMemo(() => buildHierarchy(chart.data ?? []), [chart.data])

  usePageMeta({ title: __('Organizational Chart') })

  function run() {
    setRequestedCompany(company.trim() || 'All Companies')
  }

  function renderNode(node: HierarchyNode, visited: Set<string> = new Set()): React.ReactNode {
    if (visited.has(node.id)) return null
    const nextVisited = new Set(visited).add(node.id)
    const childNodes = hierarchy.children.get(node.id) ?? []
    return (
      <li key={node.id} className="flex flex-col gap-2">
        <button
          type="button"
          className="flex items-center gap-3 rounded-xl border border-outline-gray-2 bg-surface-base p-3 text-left shadow-sm hover:border-outline-gray-3"
          onClick={() => navigate(`/app/Employee/${encodeURIComponent(node.id)}`)}
        >
          {node.image ? <img src={node.image} alt="" className="size-9 rounded-full object-cover" /> : <span className="flex size-9 items-center justify-center rounded-full bg-surface-blue-2 text-sm-medium text-ink-blue-7">{node.name.slice(0, 1)}</span>}
          <span className="min-w-0">
            <span className="block truncate text-sm-medium text-ink-gray-9">{node.name}</span>
            {node.title && <span className="block truncate text-xs text-ink-gray-6">{node.title}</span>}
          </span>
        </button>
        {childNodes.length > 0 && <ul className="ml-6 flex flex-col gap-2 border-l border-outline-gray-2 pl-4">{childNodes.map((child) => renderNode(child, nextVisited))}</ul>}
      </li>
    )
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader
        left={<h1 className="text-base-medium text-ink-gray-9">{__('Organizational Chart')}</h1>}
        right={<Button variant="ghost" icon="lucide-refresh-ccw" aria-label={__('Refresh')} loading={chart.loading} onClick={() => void chart.reload()} />}
      />
      <div className="flex items-end gap-2 border-b border-outline-gray-2 px-4 py-3 sm:px-6">
        <FormControl type="text" label={__('Company')} value={company} onChange={(value) => setCompany(String(value))} onKeyDown={(event) => { if (event.key === 'Enter') run() }} />
        <Button variant="solid" label={__('View Chart')} onClick={run} />
      </div>
      {chart.error ? <ErrorMessage className="m-6" message={String(chart.error.message ?? chart.error)} /> : chart.loading && !chart.data?.length ? <div className="flex flex-1 items-center justify-center"><Spinner size="md" /></div> : hierarchy.roots.length ? <div className="overflow-auto p-4 sm:p-8"><ul className="mx-auto flex max-w-4xl flex-col gap-3">{hierarchy.roots.map((node) => renderNode(node))}</ul></div> : <div className="flex flex-1 items-center justify-center p-8 text-sm text-ink-gray-6">{__('No active employees found for this company')}</div>}
    </main>
  )
}
