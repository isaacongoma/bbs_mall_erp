import { FeatherIcon, Tooltip } from '@/design-system'
import { AvatarPrefix } from '@/shared/components/ListViews/AvatarPrefix'
import { richPrefix } from '@/shared/components/ListViews/genericListConfig'
import type { DocCellApi, DocListConfig } from '@/shared/components/ListViews/DocListView'
import { mobilePrefix } from '@/shared/components/ListViews/listPrefixes'
import { CalendarIcon } from '@/shared/components/Icons'
import { formatDate } from '@/shared/utils/date'
import { TaskPriorityIcon, TaskStatusIcon } from '../components/Icons'

const recordRoute =
  (name: string, param: string): DocListConfig['getRowRoute'] =>
  (row, route) => ({
    name,
    params: { [param]: row.name },
    query: { view: route.viewQuery, viewType: route.viewType },
  })

export const leadsListConfig: DocListConfig = {
  doctype: 'CRM Lead',
  rich: true,
  getRowRoute: recordRoute('Lead', 'leadId'),
  prefix: (api) =>
    richPrefix(api, (cell) => {
      if (cell.column.key === 'lead_name') {
        return <AvatarPrefix show={Boolean(cell.item.label)} image={cell.item.image} label={cell.item.image_label} />
      }
      if (cell.column.key === 'lead_owner') {
        return (
          <AvatarPrefix show={Boolean(cell.item.full_name)} image={cell.item.user_image} label={cell.item.full_name} />
        )
      }
      return undefined
    }),
}

export const dealsListConfig: DocListConfig = {
  doctype: 'CRM Deal',
  rich: true,
  getRowRoute: recordRoute('Deal', 'dealId'),
  prefix: (api) =>
    richPrefix(api, (cell) => {
      if (cell.column.key === 'organization') {
        return <AvatarPrefix show={Boolean(cell.item.label)} image={cell.item.logo} label={cell.item.label} />
      }
      if (cell.column.key === 'deal_owner') {
        return (
          <AvatarPrefix show={Boolean(cell.item.full_name)} image={cell.item.user_image} label={cell.item.full_name} />
        )
      }
      return undefined
    }),
}

export const contactsListConfig: DocListConfig = {
  doctype: 'Contact',
  getRowRoute: recordRoute('Contact', 'contactId'),
  prefix: (api) => {
    if (api.column.key === 'full_name') {
      return <AvatarPrefix show={Boolean(api.item.label)} image={api.item.image} label={api.item.image_label} />
    }
    if (api.column.key === 'company_name') {
      return <AvatarPrefix show={Boolean(api.item.label)} image={api.item.logo} label={api.item.label} />
    }
    return mobilePrefix(api)
  },
}

export const organizationsListConfig: DocListConfig = {
  doctype: 'CRM Organization',
  getRowRoute: recordRoute('Organization', 'organizationId'),
  prefix: (api) =>
    api.column.key === 'organization_name' ? (
      <AvatarPrefix show={Boolean(api.item.label)} image={api.item.logo} label={api.item.label} />
    ) : undefined,
}

export function tasksListConfig(onShowTask: (name: string) => void): DocListConfig {
  return {
    doctype: 'CRM Task',
    htmlTextEditor: true,
    onRowClick: (row) => onShowTask(row.name),
    fullCell: (api: DocCellApi) => {
      if (api.column.key !== 'due_date' || !api.item) return undefined
      return (
        <div>
          <Tooltip text={api.item && formatDate(api.item, 'ddd, MMM D, YYYY | hh:mm a')}>
            <div className="flex items-center gap-2 truncate text-base">
              <div>
                <CalendarIcon />
              </div>
              <div className="truncate">{formatDate(api.item, 'D MMM, hh:mm a')}</div>
            </div>
          </Tooltip>
        </div>
      )
    },
    prefix: (api) => {
      if (api.column.key === 'status') {
        return (
          <div>
            <TaskStatusIcon status={api.item} />
          </div>
        )
      }
      if (api.column.key === 'priority') {
        return (
          <div>
            <TaskPriorityIcon priority={api.item} />
          </div>
        )
      }
      if (api.column.key === 'assigned_to') {
        return (
          <AvatarPrefix show={Boolean(api.item.full_name)} image={api.item.user_image} label={api.item.full_name} />
        )
      }
      return undefined
    },
  }
}

export function callLogsListConfig(onShowCallLog: (name: string) => void): DocListConfig {
  return {
    doctype: 'CRM Call Log',
    statusBadge: true,
    plainDurationKey: true,
    onRowClick: (row) => onShowCallLog(row.name),
    prefix: (api) => {
      if (['caller', 'receiver'].includes(api.column.key)) {
        return <AvatarPrefix show={Boolean(api.item.label)} image={api.item.image} label={api.item.label} />
      }
      if (['type', 'duration'].includes(api.column.key)) {
        return (
          <div>
            <FeatherIcon name={api.item.icon} className="h-3 w-3" />
          </div>
        )
      }
      return undefined
    },
  }
}
