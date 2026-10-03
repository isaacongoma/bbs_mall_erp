import { useEffect, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Badge, Button } from '@/design-system'
import { LoadingIndicator } from '@/shared/components/Icons'
import { SettingsLayoutBase } from '@/shared/components/Settings/SettingsPanel'
import { loadCapabilities } from '../../stores/workflowCapabilitiesStore'
import { workflowEdges, workflowNodes } from '../../utils/workflowGraph'
import { toTree } from '../../utils/workflowSteps'
import { WorkflowFlow } from './WorkflowFlow'

type AnyRecord = Record<string, any>

export interface WorkflowAutomationDetailProps {
  automationName: string
  onEdit: () => void
  onBack: () => void
}

export function WorkflowAutomationDetail({ automationName, onEdit, onBack }: WorkflowAutomationDetailProps) {
  const [loading, setLoading] = useState(true)
  const [doc, setDoc] = useState<AnyRecord>({})

  useEffect(() => {
    let cancelled = false
    void rpc<AnyRecord>({ url: 'frappe.client.get', params: { doctype: 'Automation Flow', name: automationName } })
      .then(async (saved) => {
        await loadCapabilities(saved.document_type)
        if (!cancelled) setDoc(saved)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [automationName])

  const tree = toTree(doc.actions || [])
  const graphDoc = { ...doc, actions: tree }

  return (
    <SettingsLayoutBase
      title={
        <div className="flex items-start gap-2">
          <Button
            className="-ml-2 shrink-0"
            variant="ghost"
            icon="lucide-chevron-left"
            aria-label={__('Back to automations')}
            onClick={onBack}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-h-7 items-center gap-2">
              <h2 className="truncate text-2xl-semibold">{doc.title || __('Automation')}</h2>
              <Badge
                label={doc.enabled ? __('Enabled') : __('Draft')}
                theme={doc.enabled ? 'green' : 'orange'}
                variant="subtle"
              />
              {doc.disabled_reason && <Badge label={doc.disabled_reason} theme="red" variant="subtle" />}
            </div>
          </div>
        </div>
      }
      headerActions={<Button label={__('Edit')} variant="solid" iconLeft="lucide-pencil" onClick={onEdit} />}
    >
      {loading ? (
        <div className="mt-12 flex justify-center">
          <LoadingIndicator className="w-4" />
        </div>
      ) : (
        <div className="h-full min-h-[480px] overflow-hidden rounded border border-outline-gray-2">
          <WorkflowFlow nodes={workflowNodes(graphDoc)} edges={workflowEdges(tree)} readonly />
        </div>
      )}
    </SettingsLayoutBase>
  )
}
