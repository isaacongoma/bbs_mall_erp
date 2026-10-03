import { __ } from '@/core/i18n'
import { getUser } from '@/shared/stores/usersStore'
import { getOrganization } from '../stores/organizationsStore'
import { getDealStatus } from '../stores/statusesStore'
import { timestampCell } from './timestampCell'

type AnyRecord = Record<string, any>

export function dealColumns() {
  return [
    { label: __('Organization'), key: 'organization', width: '11rem' },
    { label: __('Amount'), key: 'deal_value', align: 'right', width: '9rem' },
    { label: __('Status'), key: 'status', width: '10rem' },
    { label: __('Email'), key: 'email', width: '12rem' },
    { label: __('Mobile Number'), key: 'mobile_no', width: '11rem' },
    { label: __('Deal Owner'), key: 'deal_owner', width: '10rem' },
    { label: __('Last Modified'), key: 'modified', width: '8rem' },
  ]
}

export function contactColumns() {
  return [
    { label: __('Name'), key: 'full_name', width: '17rem' },
    { label: __('Email'), key: 'email', width: '12rem' },
    { label: __('Phone'), key: 'mobile_no', width: '12rem' },
    { label: __('Organization'), key: 'company_name', width: '12rem' },
    { label: __('Last Modified'), key: 'modified', width: '8rem' },
  ]
}

export function dealRow(
  deal: AnyRecord,
  getFormattedCurrency: (fieldname: string, doc: AnyRecord) => string,
  organizationLogo?: string | null,
) {
  return {
    name: deal.name,
    organization: {
      label: deal.organization,
      logo: organizationLogo !== undefined ? organizationLogo : getOrganization(deal.organization)?.organization_logo,
    },
    deal_value: getFormattedCurrency('deal_value', deal),
    status: { label: deal.status, color: getDealStatus(deal.status)?.color },
    email: deal.email,
    mobile_no: deal.mobile_no,
    deal_owner: {
      label: deal.deal_owner && getUser(deal.deal_owner).full_name,
      ...(deal.deal_owner ? getUser(deal.deal_owner) : {}),
    },
    modified: timestampCell(deal.modified),
  }
}

export function contactRow(contact: AnyRecord, organizationLogo?: string | null) {
  return {
    name: contact.name,
    full_name: { label: contact.full_name, image_label: contact.full_name, image: contact.image },
    email: contact.email_id,
    mobile_no: contact.mobile_no,
    company_name: { label: contact.company_name, logo: organizationLogo },
    modified: timestampCell(contact.modified),
  }
}
