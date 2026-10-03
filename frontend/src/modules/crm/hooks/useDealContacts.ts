import { call } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { toast } from '@/design-system'
import { useGlobalStore } from '@/shared/stores/globalStore'

type AnyRecord = Record<string, any>

const API = 'crm.fcrm.doctype.crm_deal.crm_deal'

export function useDealContacts(dealId: string) {
  const makeCall = useGlobalStore((state) => state.makeCall)

  const contacts = useResource<AnyRecord[]>({
    url: 'crm.fcrm.doctype.crm_deal.api.get_deal_contacts',
    params: { name: dealId },
    cache: ['deal_contacts', dealId],
    auto: true,
    transform: (data: AnyRecord[]) => data.map((contact, index) => ({ ...contact, opened: index === 0 })),
  })

  async function mutate(method: string, contact: string, message: string) {
    const result = await call(`${API}.${method}`, { deal: dealId, contact })
    if (result) {
      void contacts.reload()
      toast.success(message)
    }
  }

  async function addContact(contact: string) {
    if (contacts.data?.find((candidate) => candidate.name === contact)) {
      toast.error(__('Contact Already Added'))
      return
    }
    await mutate('add_contact', contact, __('Contact Added'))
  }

  function removeContact(contact: string) {
    return mutate('remove_contact', contact, __('Contact Removed'))
  }

  function setPrimaryContact(contact: string) {
    return mutate('set_primary_contact', contact, __('Primary Contact Set'))
  }

  function triggerCall() {
    const primary = contacts.data?.find((contact) => contact.is_primary)
    if (!primary) {
      toast.error(__('No Primary Contact Set'))
      return
    }
    const mobileNo = primary.mobile_no || null
    if (!mobileNo) {
      toast.error(__('No Mobile Number Set'))
      return
    }
    makeCall(mobileNo)
  }

  return { contacts, addContact, removeContact, setPrimaryContact, triggerCall }
}
