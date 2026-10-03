import { useState } from 'react'
import { DocListPage } from '@/shared/components/DocListPage'
import { ContactsIcon } from '@/shared/components/Icons'
import { useUsers } from '@/shared/hooks/useUsers'
import { ContactModal } from '../components/Modals'
import { useOrganizations } from '../hooks/useOrganizations'
import { useSettings } from '../hooks/useSettings'
import { contactsListConfig } from '../utils/listConfigs'
import { contactCells } from '../utils/listRows'

export default function Contacts() {
  useUsers()
  useOrganizations()
  const { brand } = useSettings()
  const [showContactModal, setShowContactModal] = useState(false)

  return (
    <DocListPage
      routeName="Contacts"
      doctype="Contact"
      emptyName="Contacts"
      emptyIcon={ContactsIcon}
      config={contactsListConfig}
      brandFavicon={brand.favicon}
      rows={{ flat: true, cells: contactCells() }}
      onCreate={() => setShowContactModal(true)}
      modals={
        showContactModal && <ContactModal open={showContactModal} onOpenChange={setShowContactModal} contact={{}} />
      }
    />
  )
}
