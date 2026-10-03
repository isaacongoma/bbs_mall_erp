import { useState } from 'react'
import { DocListPage } from '@/shared/components/DocListPage'
import { OrganizationsIcon } from '../components/Icons'
import { OrganizationModal } from '../components/Modals'
import { useSettings } from '../hooks/useSettings'
import { organizationsListConfig } from '../utils/listConfigs'
import { organizationCells } from '../utils/listRows'

export default function Organizations() {
  const { brand } = useSettings()
  const [showOrganizationModal, setShowOrganizationModal] = useState(false)

  return (
    <DocListPage
      routeName="Organizations"
      doctype="CRM Organization"
      emptyName="Organizations"
      emptyIcon={OrganizationsIcon}
      config={organizationsListConfig}
      brandFavicon={brand.favicon}
      rows={{ flat: true, cells: organizationCells() }}
      onCreate={() => setShowOrganizationModal(true)}
      modals={
        showOrganizationModal && (
          <OrganizationModal open={showOrganizationModal} onOpenChange={setShowOrganizationModal} />
        )
      }
    />
  )
}
