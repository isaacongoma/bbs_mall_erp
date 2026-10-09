import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useRoute } from '@/core/navigation'
import { useDoctypeSegment } from '@/shared/frappe/docUrl'
import { Spinner } from '@/design-system'
import { loadDeskBoot } from '../frappe/boot'
import { hasPageScript } from '../frappe/scriptLoader'
import { findWorkspace, workspacePages, type DeskWorkspace } from '../utils/deskWorkspace'
import { useMeta } from '../hooks/useMeta'
import DeskPageHost from './DeskPageHost'
import DeskWorkspacePage from './DeskWorkspacePage'

const DeskListPage = lazy(() => import('./DeskListPage'))
const DeskTreePage = lazy(() => import('./DeskTreePage'))

function ListOrTree({ doctype, viewType, spinner }: { doctype: string; viewType?: string; spinner: ReactNode }) {
  const meta = useMeta(doctype)
  const docMeta = meta.doctypeMeta as { default_view?: string } | null
  if (viewType === 'tree') return <DeskTreePage key={doctype} doctype={doctype} />
  if (!viewType && !docMeta) return spinner
  if (!viewType && docMeta?.default_view === 'Tree') return <DeskTreePage key={doctype} doctype={doctype} />
  return <DeskListPage />
}

export default function DeskEntryPage() {
  const route = useRoute()
  const target = useDoctypeSegment(route.params.doctype)
  const [workspaces, setWorkspaces] = useState<DeskWorkspace[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadDeskBoot().then((boot) => {
      if (!cancelled) setWorkspaces(workspacePages(boot.workspaces))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const spinner = (
    <div className="flex flex-1 items-center justify-center">
      <Spinner size="md" />
    </div>
  )
  if (!workspaces || !target) return spinner
  const workspace = route.params.viewType ? null : findWorkspace(workspaces, target)
  if (workspace) return <DeskWorkspacePage key={String(workspace.name)} page={workspace} />
  if (!route.params.viewType && hasPageScript(target)) return <DeskPageHost key={target} name={target} />
  return (
    <Suspense fallback={spinner}>
      <ListOrTree doctype={target} viewType={route.params.viewType} spinner={spinner} />
    </Suspense>
  )
}
