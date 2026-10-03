import { __ } from '@/core/i18n'
import { getUser } from '@/shared/stores/usersStore'
import { formatDate, formatTime, timeAgo } from '@/shared/utils/date'
import type { CellBuilders } from '@/shared/utils/listRows'
import { website } from '@/shared/utils/url'
import { getOrganization } from '../stores/organizationsStore'
import { getDealStatus, getLeadStatus } from '../stores/statusesStore'
import { timestampCell } from './timestampCell'

type AnyRecord = Record<string, any>

export const LEAD_DEAL_EXTRA_KEYS = ['_email_count', '_note_count', '_task_count', '_comment_count']

function slaCell(record: AnyRecord) {
  let value = record.sla_status
  let tooltipText = value
  let color = record.sla_status === 'Failed' ? 'red' : record.sla_status === 'Fulfilled' ? 'green' : 'orange'
  if (value === 'First Response Due' || value === 'Rolling Response Due') {
    value = __(timeAgo(record.response_by))
    tooltipText = formatDate(record.response_by)
    if (new Date(record.response_by) < new Date()) color = 'red'
  }
  return { label: tooltipText, value, color }
}

function responseCell(row: string, record: AnyRecord) {
  const field = row === 'response_by' ? 'response_by' : 'first_responded_on'
  return {
    label: record[field] ? formatDate(record[field]) : '',
    timeAgo: record[row] ? (row === 'first_response_time' ? formatTime(record[row]) : __(timeAgo(record[row]))) : '',
  }
}

function assignCell(record: AnyRecord) {
  const assignees: string[] = JSON.parse(record._assign || '[]')
  return assignees.map((user) => ({
    name: user,
    image: getUser(user).user_image,
    label: getUser(user).full_name,
  }))
}

function ownerCell(owner: string | null | undefined) {
  return {
    label: owner && getUser(owner).full_name,
    ...(owner ? getUser(owner) : {}),
  }
}

function timestampCells(): CellBuilders {
  return {
    modified: (record) => timestampCell(record.modified),
    creation: (record) => timestampCell(record.creation),
  }
}

function responseCells(): CellBuilders {
  return {
    first_response_time: (record) => responseCell('first_response_time', record),
    first_responded_on: (record) => responseCell('first_responded_on', record),
    response_by: (record) => responseCell('response_by', record),
  }
}

export function leadCells(): CellBuilders {
  return {
    lead_name: (record) => ({ label: record.lead_name, image: record.image, image_label: record.first_name }),
    organization: (record) => record.organization,
    website: (record) => ({ label: website(record.website), url: record.website }),
    status: (record) => ({ label: record.status, color: getLeadStatus(record.status)?.color }),
    sla_status: slaCell,
    lead_owner: (record) => ownerCell(record.lead_owner),
    _assign: assignCell,
    ...timestampCells(),
    ...responseCells(),
  }
}

export function dealCells(): CellBuilders {
  return {
    organization: (record) => ({
      label: record.organization,
      logo: getOrganization(record.organization)?.organization_logo,
    }),
    website: (record) => ({ label: website(record.website), url: record.website }),
    status: (record) => ({ label: record.status, color: getDealStatus(record.status)?.color }),
    sla_status: slaCell,
    deal_owner: (record) => ownerCell(record.deal_owner),
    _assign: assignCell,
    ...timestampCells(),
    ...responseCells(),
  }
}

export function contactCells(): CellBuilders {
  return {
    full_name: (record) => ({ label: record.full_name, image_label: record.full_name, image: record.image }),
    company_name: (record) => ({
      label: record.company_name,
      logo: getOrganization(record.company_name)?.organization_logo,
    }),
    ...timestampCells(),
  }
}

export function organizationCells(): CellBuilders {
  return {
    organization_name: (record) => ({ label: record.organization_name, logo: record.organization_logo }),
    website: (record) => website(record.website),
    ...timestampCells(),
  }
}
