import { useState } from 'react'
import { useRoute } from '@/core/navigation'
import { DocListPage } from '@/shared/components/DocListPage'
import { IndicatorIcon } from '@/shared/components/Icons'
import { useUsers } from '@/shared/hooks/useUsers'
import { CrmKanban } from '../components/CrmKanban'
import { DealsIcon } from '../components/Icons'
import { LostReasonModal } from '../components/LostReasonModal'
import { DealModal } from '../components/Modals'
import { useOrganizations } from '../hooks/useOrganizations'
import { useSettings } from '../hooks/useSettings'
import { useStatuses } from '../hooks/useStatuses'
import { getDealStatus } from '../stores/statusesStore'
import { dealsListConfig } from '../utils/listConfigs'
import { LEAD_DEAL_EXTRA_KEYS, dealCells } from '../utils/listRows'
import { isKanbanLostStatusFor, isLostStatus } from '../utils/lostStatus'

type AnyRecord = Record<string, any>

export default function Deals() {
  useUsers()
  useStatuses()
  useOrganizations()
  const route = useRoute()
  const { brand } = useSettings()
  const [showDealModal, setShowDealModal] = useState(false)
  const [defaults, setDefaults] = useState<AnyRecord>({})

  const viewQuery = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view

  return (
    <DocListPage
      routeName="Deals"
      doctype="CRM Deal"
      emptyName="Deals"
      emptyIcon={DealsIcon}
      config={dealsListConfig}
      brandFavicon={brand.favicon}
      rows={{
        cells: dealCells(),
        extraKeys: LEAD_DEAL_EXTRA_KEYS,
        groupIcon: (_field, option) => () => <IndicatorIcon className={getDealStatus(option)?.color} />,
      }}
      onCreate={() => setShowDealModal(true)}
      isLostStatus={isLostStatus}
      isKanbanLostStatus={isKanbanLostStatusFor('CRM Deal')}
      lostReasonModal={LostReasonModal}
      renderKanban={({ controller, rows }) => (
        <CrmKanban
          doctype="CRM Deal"
          routeName="Deal"
          paramName="dealId"
          controller={controller}
          rows={rows}
          viewQuery={viewQuery}
          viewType={route.params.viewType}
          onNewClick={(column) => {
            const columnField = controller.list.params?.column_field
            if (columnField) setDefaults((current) => ({ ...current, [columnField]: column.column.name }))
            setShowDealModal(true)
          }}
        />
      )}
      modals={showDealModal && <DealModal open={showDealModal} onOpenChange={setShowDealModal} defaults={defaults} />}
    />
  )
}
