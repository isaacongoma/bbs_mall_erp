import { useState } from 'react'
import { useRoute } from '@/core/navigation'
import { DocListPage } from '@/shared/components/DocListPage'
import { IndicatorIcon } from '@/shared/components/Icons'
import { useBroadcast } from '@/shared/hooks/useBroadcast'
import { useUsers } from '@/shared/hooks/useUsers'
import { CrmKanban } from '../components/CrmKanban'
import { LeadsIcon } from '../components/Icons'
import { LostReasonModal } from '../components/LostReasonModal'
import { LeadModal } from '../components/Modals'
import { useOrganizations } from '../hooks/useOrganizations'
import { useSettings } from '../hooks/useSettings'
import { useStatuses } from '../hooks/useStatuses'
import { getLeadStatus } from '../stores/statusesStore'
import { crmBulkActions } from '../utils/bulkActions'
import { leadsListConfig } from '../utils/listConfigs'
import { LEAD_DEAL_EXTRA_KEYS, leadCells } from '../utils/listRows'
import { isKanbanLostStatusFor, isLostStatus } from '../utils/lostStatus'

type AnyRecord = Record<string, any>

const CONTROLLER_OPTIONS = { allowedViews: ['list', 'group_by', 'kanban'] }
const FILTERS = { converted: 0 }

export default function Leads() {
  useUsers()
  useStatuses()
  useOrganizations()
  const route = useRoute()
  const { brand } = useSettings()
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [defaults, setDefaults] = useState<AnyRecord>({})

  useBroadcast('trigger_lead_create', (data) => setShowLeadModal(Boolean(data)))

  const viewQuery = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view

  return (
    <DocListPage
      routeName="Leads"
      doctype="CRM Lead"
      emptyName="Leads"
      emptyIcon={LeadsIcon}
      config={leadsListConfig}
      filters={FILTERS}
      controllerOptions={CONTROLLER_OPTIONS}
      brandFavicon={brand.favicon}
      rows={{
        cells: leadCells(),
        extraKeys: LEAD_DEAL_EXTRA_KEYS,
        groupIcon: (_field, option) => () => <IndicatorIcon className={getLeadStatus(option)?.color} />,
      }}
      onCreate={() => setShowLeadModal(true)}
      extraBulkActions={(list) => crmBulkActions('CRM Lead', list)}
      isLostStatus={isLostStatus}
      isKanbanLostStatus={isKanbanLostStatusFor('CRM Lead')}
      lostReasonModal={LostReasonModal}
      renderKanban={({ controller, rows }) => (
        <CrmKanban
          doctype="CRM Lead"
          routeName="Lead"
          paramName="leadId"
          controller={controller}
          rows={rows}
          viewQuery={viewQuery}
          viewType={route.params.viewType}
          onNewClick={(column) => {
            const columnField = controller.list.params?.column_field
            if (columnField) setDefaults((current) => ({ ...current, [columnField]: column.column.name }))
            setShowLeadModal(true)
          }}
        />
      )}
      modals={showLeadModal && <LeadModal open={showLeadModal} onOpenChange={setShowLeadModal} defaults={defaults} />}
    />
  )
}
