import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rpc } from '@/core/api/rpc'
import { useRoute } from '@/core/navigation'
import { useDoctypeSegment } from '@/shared/frappe/docUrl'
import { useListResource, useResource } from '@/core/resources'
import { __ } from '@/core/i18n'
import { Badge, Button, Dropdown, ErrorMessage, FormControl, ListView, Spinner, usePageMeta } from '@/design-system'
import { indicatorTheme } from '../utils/indicatorTheme'
import { sanitizeHTML } from '../utils/text'
import { LayoutHeader } from '../components/LayoutHeader'
import { EmptyState } from '../components/ListViews'
import DeskDashboardPage from './DeskDashboardPage'
import DeskFormPage from './DeskFormPage'
import { useMeta } from '../hooks/useMeta'
import type { DocField, DocRecord } from '../types/meta'
import { downloadCsv } from '../utils/csv'
import { AssignmentModal, type Assignee } from '../components/AssignmentModal'
import { EditValueModal } from '../components/EditValueModal'
import { DeskListSettings, type DeskListSettingsValue } from '../components/DeskListSettings'
import { renderFieldLayoutDialog } from '../utils/renderFieldLayoutDialog'
import { currentSessionUser } from '../stores/usersStore'
import { DeskInboxView } from '../components/DeskInboxView'
import { useListViewSettings } from '../hooks/useListViewSettings'
import { indicatorFor, settingsFilters } from '../frappe/listView'
import { DeskTableList } from '../components/DeskTableList'
import { DeskListGroupSidebar, type DeskListGroup } from '../components/DeskListGroupSidebar'

function listFields(fields: DocField[]): DocField[] {
  const visible = fields.filter((field) => field.in_list_view || field.in_standard_filter)
  return visible.length ? visible.slice(0, 8) : fields.filter((field) => !field.hidden).slice(0, 8)
}

function fieldOptions(field: DocField): Array<{ label: string; value: string }> {
  if (Array.isArray(field.options)) return field.options.map((option) => ({ label: String(option.label ?? option), value: String(option.value ?? option) }))
  if (typeof field.options === 'string') {
    return field.options.split('\n').filter(Boolean).map((option) => ({ label: __(option), value: option }))
  }
  return []
}

function filterFields(fields: DocField[]): DocField[] {
  return fields.filter((field) => field.in_standard_filter && ['Data', 'Select', 'Link'].includes(field.fieldtype)).slice(0, 4)
}

function settingFields(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

function statusTone(value: string): 'blue' | 'green' | 'red' | 'orange' | 'gray' {
  const normalized = value.toLowerCase()
  if (['completed', 'approved', 'active', 'open', 'submitted', 'paid'].some((entry) => normalized.includes(entry))) return 'green'
  if (['cancelled', 'rejected', 'closed', 'inactive', 'overdue'].some((entry) => normalized.includes(entry))) return 'red'
  if (['pending', 'draft', 'in progress', 'partly'].some((entry) => normalized.includes(entry))) return 'orange'
  return 'blue'
}

interface SavedListFilter {
  name: string
  search: string
  sort: string
  filters: Record<string, unknown>
  groupBy: string
  scope: string
}

function savedFilterKey(doctype: string): string {
  return `desk-saved-filters:${doctype}`
}

function loadSavedFilters(doctype: string): SavedListFilter[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(savedFilterKey(doctype)) ?? '[]')
    return Array.isArray(value) ? value.filter((entry): entry is SavedListFilter => Boolean(entry && typeof entry.name === 'string')) : []
  } catch {
    return []
  }
}

export default function DeskListPage() {
  const route = useRoute()
  const navigate = useNavigate()
  const doctype = useDoctypeSegment(route.params.doctype)
  const viewType = ['kanban', 'calendar', 'image', 'tree', 'gantt', 'dashboard', 'inbox'].includes(String(route.params.viewType)) ? String(route.params.viewType) : 'table'
  const meta = useMeta(doctype)
  const listSettings = useResource({
    url: 'frappe.desk.listview.get_list_settings',
    params: { doctype },
    cache: ['desk-list-settings', doctype],
    auto: Boolean(doctype),
    initialData: null,
  })
  const { settings: viewSettings, facade: listFacade } = useListViewSettings(doctype)
  const extraFields = useMemo(() => ((viewSettings.add_fields ?? []) as string[]).concat(listFacade ? ['docstatus'] : []), [listFacade, viewSettings])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('modified desc')
  const [filters, setFilters] = useState<Record<string, unknown>>({})
  const [groupBy, setGroupBy] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<{ field: string; value: string } | null>(null)
  const [selections, setSelections] = useState<Set<string | number>>(new Set())
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [bulkAssignees, setBulkAssignees] = useState<Assignee[]>([])
  const [showListSettings, setShowListSettings] = useState(false)
  const [columnNames, setColumnNames] = useState<string[] | null>(null)
  const [pageLength, setPageLength] = useState<number | null>(null)
  const [disableCount, setDisableCount] = useState<boolean | null>(null)
  const [disableSidebar, setDisableSidebar] = useState<boolean | null>(null)
  const [scope, setScope] = useState('all')
  const [savedFilters, setSavedFilters] = useState<SavedListFilter[]>(() => loadSavedFilters(doctype))
  const savedSettings = (listSettings.data ?? {}) as Record<string, unknown>
  const savedFields = settingFields(savedSettings.fields)
  const effectivePageLength = pageLength ?? Math.max(20, Number(savedSettings.page_length) || 20)
  const effectiveDisableCount = disableCount ?? Boolean(Number(savedSettings.disable_count))
  const effectiveDisableSidebar = disableSidebar ?? Boolean(Number(savedSettings.disable_sidebar))
  const effectiveColumnNames = columnNames ?? (savedFields.length ? savedFields : null)
  const fields = useMemo(() => listFields(meta.getFields({ restrictNoValueFields: false })), [meta])
  const visibleFields = useMemo(
    () => (effectiveColumnNames ? fields.filter((field) => effectiveColumnNames.includes(field.fieldname)) : fields),
    [effectiveColumnNames, fields],
  )
  const availableFilters = useMemo(() => filterFields(meta.getFields({ restrictNoValueFields: false })), [meta])
  const queryFilters = useMemo(() => {
    const routeFilters: Record<string, unknown> = Object.fromEntries(Object.entries(route.query).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]))
    const next: Record<string, unknown> = { ...settingsFilters(viewSettings), ...routeFilters, ...filters }
    if (search.trim()) next.name = ['like', `%${search.trim()}%`]
    if (scope === 'mine' && currentSessionUser()) next.owner = currentSessionUser()
    if (scope === 'liked' && currentSessionUser()) next._liked_by = ['like', `%${currentSessionUser()}%`]
    if (scope === 'assigned' && currentSessionUser()) next._assign = ['like', `%${currentSessionUser()}%`]
    return next
  }, [filters, route.query, scope, search, viewSettings])
  const resource = useListResource({
    doctype,
    fields: ['name', ...new Set([...visibleFields.map((field) => field.fieldname), ...extraFields])],
    filters: queryFilters,
    orderBy: sort,
    pageLength: effectivePageLength,
    auto: Boolean(meta.doctypeMeta && !meta.doctypeMeta.issingle),
  })

  usePageMeta({ title: doctype })

  useEffect(() => {
    if (!meta.doctypeMeta || meta.doctypeMeta.issingle) return
    resource.update({
      fields: ['name', ...new Set([...visibleFields.map((field) => field.fieldname), ...extraFields])],
      filters: queryFilters,
      orderBy: sort,
      start: 0,
      pageLength: effectivePageLength,
    })
    resource.fetch()
  }, [doctype, effectivePageLength, extraFields, meta.doctypeMeta, queryFilters, resource, sort, visibleFields])

  const rows = useMemo(() => (resource.data ?? []) as DocRecord[], [resource.data])
  useEffect(() => {
    if (!listFacade) return
    listFacade.data = rows
    listFacade.bind(
      () => rows.filter((row) => selections.has(String(row.name))),
      () => void resource.reload(),
    )
  }, [listFacade, resource, rows, selections])
  const hasIndicator = typeof viewSettings.get_indicator === 'function' || rows.some((row) => 'docstatus' in row)
  const columns = visibleFields.map((field) => ({ key: field.fieldname, label: field.label ?? field.fieldname }))
  const indicatorFields = new Set(visibleFields.filter((field) => field.fieldname === 'status' || field.fieldname === 'workflow_state' || field.fieldtype === 'Select').map((field) => field.fieldname))
  if (!columns.some((column) => column.key === 'name') && !viewSettings.hide_name_column) columns.unshift({ key: 'name', label: __('Name') })
  if (hasIndicator) columns.push({ key: '__indicator', label: __('Status') })
  const kanbanField = visibleFields.find((field) => field.fieldtype === 'Select') ?? visibleFields.find((field) => field.fieldname === 'status') ?? { fieldname: 'status', fieldtype: 'Data' }
  const kanbanValues = kanbanField
    ? fieldOptions(kanbanField).map((option) => option.value).filter(Boolean)
    : [...new Set(rows.map((row) => String(row.status ?? '')))].filter(Boolean)
  const kanbanColumns = kanbanValues.length ? kanbanValues : ['']
  const calendarField = visibleFields.find((field) => ['Date', 'Datetime'].includes(field.fieldtype))
  const imageField = visibleFields.find((field) => ['Attach Image', 'Image'].includes(field.fieldtype))
  const startDateField = visibleFields.find((field) => ['Date', 'Datetime'].includes(field.fieldtype) && /start|from|date/i.test(field.fieldname)) ?? visibleFields.find((field) => ['Date', 'Datetime'].includes(field.fieldtype))
  const endDateField = visibleFields.find((field) => ['Date', 'Datetime'].includes(field.fieldtype) && /end|to/i.test(field.fieldname))
  const parentField = visibleFields.find((field) => field.fieldname === 'parent') ?? visibleFields.find((field) => field.fieldname.startsWith('parent_'))
  const groups = useMemo<DeskListGroup[]>(() => {
    if (!groupBy) return []
    const counts = new Map<string, number>()
    for (const row of rows) {
      const value = String(row[groupBy] ?? __('Unassigned'))
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return [...counts.entries()].map(([value, count]) => ({ value, count }))
  }, [groupBy, rows])

  const activeGroup = selectedGroup?.field === groupBy ? selectedGroup.value : ''
  const displayedRows = useMemo(
    () => (activeGroup ? rows.filter((row) => String(row[groupBy] ?? __('Unassigned')) === activeGroup) : rows),
    [activeGroup, groupBy, rows],
  )

  const calendarDays = useMemo(() => {
    const days = new Map<string, DocRecord[]>()
    if (!calendarField) return days
    for (const row of displayedRows) {
      const value = row[calendarField.fieldname]
      if (!value) continue
      const key = String(value).slice(0, 10)
      const dayRows = days.get(key) ?? []
      dayRows.push(row)
      days.set(key, dayRows)
    }
    return days
  }, [calendarField, displayedRows])

  const groupedRows = useMemo(() => {
    if (!groupBy) return displayedRows
    const groups = new Map<string, DocRecord[]>()
    for (const row of displayedRows) {
      const value = String(row[groupBy] ?? __('Unassigned'))
      const group = groups.get(value) ?? []
      group.push(row)
      groups.set(value, group)
    }
    return [...groups.entries()].map(([group, groupRows]) => ({ group, rows: groupRows }))
  }, [displayedRows, groupBy])

  const treeChildren = useMemo(() => {
    const map = new Map<string, DocRecord[]>()
    if (!parentField) return map
    for (const row of rows) {
      const parent = String(row[parentField.fieldname] ?? '')
      const children = map.get(parent) ?? []
      children.push(row)
      map.set(parent, children)
    }
    return map
  }, [parentField, rows])

  const ganttDates = useMemo(() => {
    if (!startDateField) return null
    const values = rows.flatMap((row) => [row[startDateField.fieldname], endDateField ? row[endDateField.fieldname] : row[startDateField.fieldname]]).filter(Boolean).map((value) => new Date(String(value)).valueOf()).filter(Number.isFinite)
    if (!values.length) return null
    return { min: Math.min(...values), max: Math.max(...values) }
  }, [endDateField, rows, startDateField])

  function renderTree(row: DocRecord, visited: Set<string> = new Set()): React.ReactNode {
    const name = String(row.name)
    if (visited.has(name)) return null
    const nextVisited = new Set(visited).add(name)
    const children = treeChildren.get(name) ?? []
    return (
      <li key={name} className="flex flex-col gap-2">
        <button type="button" className="rounded-lg border border-outline-gray-2 bg-surface-base px-3 py-2 text-left text-sm text-ink-blue-6 hover:border-outline-gray-3" onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)}>{name}</button>
        {children.length > 0 && <ul className="ml-5 flex flex-col gap-2 border-l border-outline-gray-2 pl-3">{children.map((child) => renderTree(child, nextVisited))}</ul>}
      </li>
    )
  }

  async function deleteSelected() {
    if (!selections.size || !window.confirm(__('Delete the selected documents?'))) return
    await Promise.all([...selections].map((name) => rpc({ url: 'frappe.client.delete', method: 'DELETE', params: { doctype, name } })))
    setSelections(new Set())
    await resource.reload()
  }

  async function runBulkWorkflow(action: 'submit' | 'cancel') {
    if (!selections.size || !window.confirm(__(`{0} the selected documents?`, [action === 'submit' ? __('Submit') : __('Cancel')]))) return
    await rpc({
      url: 'frappe.desk.doctype.bulk_update.bulk_update.submit_cancel_or_update_docs',
      params: { doctype, docnames: [...selections].map(String), action },
    })
    setSelections(new Set())
    await resource.reload()
  }

  async function clearAssignments() {
    if (!selections.size || !window.confirm(__('Clear assignment for the selected documents?'))) return
    await rpc({
      url: 'frappe.desk.form.assign_to.remove_multiple',
      params: { doctype, names: JSON.stringify([...selections].map(String)), ignore_permissions: true },
    })
    setSelections(new Set())
    await resource.reload()
  }

  async function addTagSelected() {
    if (!selections.size) return
    const values = await renderFieldLayoutDialog({
      title: __('Add Tag'),
      fields: [{ fieldname: 'tag', fieldtype: 'Data', label: __('Tag'), reqd: 1 }],
      submitLabel: __('Add'),
    })
    const tag = String(values?.tag ?? '').trim()
    if (!tag) return
    await Promise.all([...selections].map((name) => rpc({ url: 'frappe.desk.doctype.tag.tag.add_tag', method: 'POST', params: { tag, dt: doctype, dn: String(name) } })))
    setSelections(new Set())
    await resource.reload()
  }

  function openAssignmentModal() {
    setBulkAssignees([])
    setShowAssignmentModal(true)
  }

  function closeBulkModal(open: boolean) {
    if (!open) setSelections(new Set())
    setShowAssignmentModal(open)
  }

  function applyListSettings(value: DeskListSettingsValue) {
    setColumnNames(value.fields)
    setPageLength(value.pageLength)
    setDisableCount(value.disableCount)
    setDisableSidebar(value.disableSidebar)
    void rpc({
      url: 'frappe.desk.listview.set_list_settings',
      method: 'POST',
      params: {
        doctype,
        values: JSON.stringify({
          fields: value.fields,
          page_length: value.pageLength,
          disable_count: value.disableCount ? 1 : 0,
          disable_sidebar: value.disableSidebar ? 1 : 0,
        }),
      },
    })
  }

  function exportRows() {
    const exportRows = selections.size ? rows.filter((row) => selections.has(String(row.name))) : rows
    downloadCsv(`${doctype.replaceAll(' ', '_')}.csv`, exportRows, columns)
  }

  function saveCurrentFilter() {
    const name = window.prompt(__('Saved filter name'))?.trim()
    if (!name) return
    const next = [...savedFilters.filter((entry) => entry.name !== name), { name, search, sort, filters, groupBy, scope }]
    setSavedFilters(next)
    window.localStorage.setItem(savedFilterKey(doctype), JSON.stringify(next))
  }

  async function addAdvancedFilter() {
    const filterable = fields.filter((field) => !['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Button'].includes(field.fieldtype))
    const values = await renderFieldLayoutDialog({
      title: __('Add Filter'),
      fields: [
        { fieldname: 'fieldname', fieldtype: 'Select', label: __('Field'), options: filterable.map((field) => `${field.fieldname}\n${field.label ?? field.fieldname}`).join('\n'), reqd: 1 },
        { fieldname: 'operator', fieldtype: 'Select', label: __('Operator'), options: '=\n!=\nlike\nnot like\nin\nnot in\nis\nis not', default: '=' },
        { fieldname: 'value', fieldtype: 'Data', label: __('Value') },
      ],
      submitLabel: __('Apply'),
    })
    const fieldname = String(values?.fieldname ?? '')
    const operator = String(values?.operator ?? '=')
    if (!fieldname) return
    const rawValue = String(values?.value ?? '')
    const value = ['in', 'not in'].includes(operator) ? [operator, rawValue.split(',').map((entry) => entry.trim()).filter(Boolean)] : operator === 'is' || operator === 'is not' ? [operator, rawValue || 'set'] : operator === '=' ? rawValue : [operator, rawValue]
    setFilters((current) => ({ ...current, [fieldname]: value }))
  }

  function removeFilter(fieldname: string) {
    setFilters((current) => {
      const next = { ...current }
      delete next[fieldname]
      return next
    })
  }

  function filterLabel(fieldname: string, value: unknown): string {
    const field = fields.find((entry) => entry.fieldname === fieldname)
    const formatted = Array.isArray(value) ? value.join(' ') : String(value ?? '')
    return `${field?.label ?? fieldname}: ${formatted}`
  }

  function applySavedFilter(name: string) {
    const saved = savedFilters.find((entry) => entry.name === name)
    if (!saved) return
    setSearch(saved.search)
    setSort(saved.sort)
    setFilters(saved.filters)
    setGroupBy(saved.groupBy)
    setSelectedGroup(null)
    setScope(saved.scope)
  }

  if (meta.doctypeMeta?.issingle) return <DeskFormPage key={doctype} doctype={doctype} docname={doctype} />
  if (viewType === 'dashboard') return <DeskDashboardPage dashboardName={doctype} />
  if (viewType === 'table') {
    const base = `/app/${encodeURIComponent(doctype)}/view`
    const viewLinks = [
      { label: __('Dashboard View'), icon: 'lucide-layout-grid', to: `${base}/dashboard` },
      { label: __('Kanban View'), icon: 'lucide-columns-3', to: `${base}/kanban` },
      ...(imageField ? [{ label: __('Image View'), icon: 'lucide-image', to: `${base}/image` }] : []),
      ...(calendarField ? [{ label: __('Calendar View'), icon: 'lucide-calendar', to: `${base}/calendar` }, { label: __('Gantt View'), icon: 'lucide-gantt-chart', to: `${base}/gantt` }] : []),
      ...(parentField ? [{ label: __('Tree View'), icon: 'lucide-network', to: `${base}/tree` }] : []),
    ]
    const routeFilters = Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'view').map(([key, value]) => [key, String(Array.isArray(value) ? value[0] : value)]))
    return <DeskTableList doctype={doctype} viewSettings={viewSettings} facade={listFacade} routeFilters={routeFilters} viewLinks={viewLinks} savedFields={savedFields} />
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader
        left={<h1 className="text-base-medium text-ink-gray-9">{__(doctype)}</h1>}
        right={
          <div className="flex items-center gap-1">
            <Button variant="ghost" icon="lucide-refresh-ccw" aria-label={__('Refresh')} loading={resource.list.loading} onClick={() => void resource.reload()} />
            {selections.size > 0 && (
              <Dropdown
                options={[
                  { label: __('Edit'), icon: 'lucide-pencil', onClick: () => setShowEditModal(true) },
                  { label: __('Assign To'), icon: 'lucide-user-plus', onClick: openAssignmentModal },
                  { label: __('Clear Assignment'), icon: 'lucide-user-minus', onClick: () => void clearAssignments() },
                  { label: __('Add Tag'), icon: 'lucide-tag', onClick: () => void addTagSelected() },
                  { label: __('Submit'), icon: 'lucide-check', onClick: () => void runBulkWorkflow('submit') },
                  { label: __('Cancel'), icon: 'lucide-ban', onClick: () => void runBulkWorkflow('cancel') },
                  { label: __('Delete'), icon: 'lucide-trash-2', onClick: () => void deleteSelected() },
                  { label: __('Export selected'), icon: 'lucide-download', onClick: exportRows },
                  ...(listFacade?.actionItems ?? []).map((entry) => ({ label: __(entry.label), onClick: () => void entry.action() })),
                ]}
              >
                <Button variant="outline" label={__('Selected: {0}', [selections.size])} />
              </Dropdown>
            )}
            <Dropdown
              options={[
                { label: __('Import'), icon: 'lucide-upload', onClick: () => navigate(`/app/data-import/doctype/${encodeURIComponent(doctype)}`) },
                { label: __('Export CSV'), icon: 'lucide-download', onClick: exportRows },
                { label: __('List Settings'), icon: 'lucide-settings-2', onClick: () => setShowListSettings(true) },
                ...(listFacade?.menuItems ?? []).map((entry) => ({ label: __(entry.label), onClick: () => void entry.action() })),
              ]}
            >
              <Button variant="ghost" icon="lucide-more-horizontal" aria-label={__('More options')} />
            </Dropdown>
            {(listFacade?.innerButtons ?? []).map((entry) => <Button key={`${entry.group ?? ''}:${entry.label}`} variant="outline" label={__(entry.label)} onClick={() => void entry.action()} />)}
            <Button variant="solid" iconLeft="lucide-plus" label={__('Create')} onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/new`)} />
          </div>
        }
      />
      <div className="flex flex-wrap items-end gap-2 border-b border-outline-gray-2 px-4 py-3 sm:px-6">
        <FormControl
          type="text"
          value={search}
          placeholder={__('Search {0}', [__(doctype)])}
          onChange={(value) => setSearch(String(value))}
          className="min-w-56"
        />
        {availableFilters.map((field) => (
          <FormControl
            className="w-44"
            key={field.fieldname}
            type={field.fieldtype === 'Select' ? 'select' : 'text'}
              value={typeof filters[field.fieldname] === 'string' ? filters[field.fieldname] as string : ''}
            options={field.fieldtype === 'Select' ? fieldOptions(field) : undefined}
            placeholder={__(field.label ?? field.fieldname)}
            onChange={(value: unknown) => {
              const next = typeof value === 'string' ? value : String(value)
              setFilters((current) => {
                const updated = { ...current }
                if (next) updated[field.fieldname] = next
                else delete updated[field.fieldname]
                return updated
              })
            }}
          />
        ))}
        <FormControl
          className="w-44"
          type="select"
          value={scope}
          options={[{ label: __('All records'), value: 'all' }, { label: __('My records'), value: 'mine' }, { label: __('Liked records'), value: 'liked' }, { label: __('Assigned records'), value: 'assigned' }]}
          onChange={(value: unknown) => setScope(String(value ?? 'all'))}
        />
        {savedFilters.length > 0 && <FormControl className="w-44" type="select" value="" options={[{ label: __('Saved filters'), value: '' }, ...savedFilters.map((entry) => ({ label: entry.name, value: entry.name }))]} onChange={(value: unknown) => applySavedFilter(String(value ?? ''))} />}
        <Button variant="ghost" icon="lucide-bookmark-plus" aria-label={__('Save filter')} onClick={saveCurrentFilter} />
        <Button variant="outline" iconLeft="lucide-filter" label={__('Filter')} onClick={() => void addAdvancedFilter()} />
        <FormControl
          className="w-44"
          type="select"
          value={sort}
          options={[
            { label: __('Modified descending'), value: 'modified desc' },
            { label: __('Modified ascending'), value: 'modified asc' },
            { label: __('Name ascending'), value: 'name asc' },
            { label: __('Name descending'), value: 'name desc' },
          ]}
          onChange={(value: unknown) => setSort(typeof value === 'string' ? value : String(value))}
        />
        {!effectiveDisableSidebar && <FormControl
          className="w-44"
          type="select"
          value={groupBy}
          options={[{ label: __('No grouping'), value: '' }, ...fields.map((field) => ({ label: __(field.label ?? field.fieldname), value: field.fieldname }))]}
          onChange={(value: unknown) => {
            setGroupBy(typeof value === 'string' ? value : String(value))
            setSelectedGroup(null)
          }}
        />}
        <div className="ml-auto flex gap-1">
          <Button variant={viewType === 'table' ? 'solid' : 'ghost'} icon="lucide-table-2" aria-label={__('Table view')} onClick={() => navigate(`/app/${encodeURIComponent(doctype)}`)} />
          <Button variant={viewType === 'kanban' ? 'solid' : 'ghost'} icon="lucide-kanban" aria-label={__('Kanban view')} onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/view/kanban`)} />
          <Button variant={viewType === 'calendar' ? 'solid' : 'ghost'} icon="lucide-calendar-days" aria-label={__('Calendar view')} onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/view/calendar`)} />
          <Button variant={viewType === 'image' ? 'solid' : 'ghost'} icon="lucide-images" aria-label={__('Image view')} onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/view/image`)} />
          <Button variant={viewType === 'tree' ? 'solid' : 'ghost'} icon="lucide-git-branch" aria-label={__('Tree view')} onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/view/tree`)} />
          <Button variant={viewType === 'gantt' ? 'solid' : 'ghost'} icon="lucide-chart-gantt" aria-label={__('Gantt view')} onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/view/gantt`)} />
          <Button variant={viewType === 'inbox' ? 'solid' : 'ghost'} icon="lucide-inbox" aria-label={__('Inbox view')} onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/view/inbox`)} />
        </div>
      </div>
      {Object.keys(filters).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-gray-2 px-4 py-2 sm:px-6">
          {Object.entries(filters).map(([fieldname, value]) => (
            <button key={fieldname} type="button" className="flex items-center gap-1 rounded-full bg-surface-gray-1 px-3 py-1 text-xs text-ink-gray-8 hover:bg-surface-gray-2" onClick={() => removeFilter(fieldname)}>
              <span>{filterLabel(fieldname, value)}</span>
              <span className="lucide-x size-3" aria-hidden="true" />
            </button>
          ))}
          <Button variant="ghost" label={__('Clear filters')} onClick={() => setFilters({})} />
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {groupBy && !effectiveDisableSidebar && (
          <DeskListGroupSidebar
            fieldLabel={fields.find((field) => field.fieldname === groupBy)?.label ?? groupBy}
            groups={groups}
            selected={activeGroup}
            onSelect={(value) => setSelectedGroup(value ? { field: groupBy, value } : null)}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {resource.list.loading && !displayedRows.length ? (
            <div className="flex flex-1 items-center justify-center py-12"><Spinner size="md" /></div>
          ) : resource.list.error ? (
            <ErrorMessage className="m-6" message={__(String(resource.list.error?.message ?? resource.list.error))} />
          ) : displayedRows.length && viewType === 'inbox' ? (
            <DeskInboxView doctype={doctype} rows={displayedRows} columns={columns} />
          ) : displayedRows.length && viewType === 'table' ? (
            <ListView
              columns={columns}
              rows={groupedRows}
              rowKey="name"
              options={{
                selectable: true,
                resizeColumn: true,
                getRowRoute: (row) => `/app/${encodeURIComponent(doctype)}/${encodeURIComponent(String(row.name))}`,
              }}
              selections={selections}
              onSelectionsChange={(next) => setSelections(new Set(next))}
              cell={({ item, column, row }) => {
                if (column.key === '__indicator') {
                  const indicator = indicatorFor(viewSettings, row as DocRecord)
                  return indicator ? <Badge label={indicator.label} theme={indicatorTheme(indicator.color)} /> : null
                }
                const formatter = viewSettings.formatters?.[column.key]
                if (typeof formatter === 'function') {
                  return <div className="truncate text-base text-ink-gray-9" dangerouslySetInnerHTML={{ __html: sanitizeHTML(String(formatter(item, { fieldname: column.key }, row) ?? '')) }} />
                }
                return (
                indicatorFields.has(column.key) ? <Badge label={String(item ?? '')} theme={statusTone(String(item ?? ''))} /> : <div className="truncate text-base text-ink-gray-9" title={String(item ?? '')}>{String(item ?? '')}</div>
                )
              }}
            />
          ) : displayedRows.length && viewType === 'kanban' ? (
        <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto p-4 sm:p-6">
          {kanbanColumns.map((value) => (
            <section key={value || '__empty'} className="flex min-w-64 flex-1 flex-col gap-2 rounded-xl bg-surface-gray-1 p-3">
              <h2 className="text-sm-medium text-ink-gray-8">{value || __('Unassigned')}</h2>
              <div className="flex flex-col gap-2">
                {displayedRows.filter((row) => String(kanbanField ? row[kanbanField.fieldname] ?? '' : '') === value).map((row) => (
                  <button key={row.name} type="button" className="rounded-lg border border-outline-gray-2 bg-surface-base p-3 text-left shadow-sm hover:border-outline-gray-3" onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/${encodeURIComponent(String(row.name))}`)}>
                    <div className="text-sm-medium text-ink-gray-9">{String(row.name)}</div>
                    {kanbanField && row[kanbanField.fieldname] && <div className="mt-1 text-xs text-ink-gray-6">{String(row[kanbanField.fieldname])}</div>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
          ) : displayedRows.length && viewType === 'calendar' ? (
        calendarField ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {[...calendarDays.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([day, dayRows]) => (
              <section key={day} className="rounded-xl border border-outline-gray-2 bg-surface-base p-3">
                <h2 className="mb-3 text-sm-medium text-ink-gray-8">{day}</h2>
                <div className="flex flex-col gap-2">
                  {dayRows.map((row) => (
                    <button key={row.name} type="button" className="rounded-lg bg-surface-gray-1 p-3 text-left text-sm text-ink-gray-8 hover:bg-surface-gray-2" onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/${encodeURIComponent(String(row.name))}`)}>
                      {String(row.name)}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : <EmptyState name={__('No date field available for this DocType')} />
          ) : displayedRows.length && viewType === 'image' ? (
        imageField ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            {displayedRows.map((row) => (
              <button key={row.name} type="button" className="overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-base text-left hover:border-outline-gray-3" onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/${encodeURIComponent(String(row.name))}`)}>
                {row[imageField.fieldname] ? <img src={String(row[imageField.fieldname])} alt={String(row.name)} className="aspect-square w-full object-cover" /> : <div className="flex aspect-square items-center justify-center bg-surface-gray-1 text-ink-gray-5">{__('No image')}</div>}
                <div className="truncate p-3 text-sm-medium text-ink-gray-9">{String(row.name)}</div>
              </button>
            ))}
          </div>
        ) : <EmptyState name={__('No image field available for this DocType')} />
          ) : displayedRows.length && viewType === 'tree' ? (
        parentField ? (
          <div className="p-4 sm:p-6">
            <ul className="flex flex-col gap-2">{displayedRows.filter((row) => !row[parentField.fieldname]).map((row) => renderTree(row))}</ul>
          </div>
        ) : <EmptyState name={__('No parent field available for this DocType')} />
          ) : displayedRows.length && viewType === 'gantt' ? (
        startDateField && ganttDates ? (
          <div className="flex flex-col gap-3 overflow-x-auto p-4 sm:p-6">
            {displayedRows.map((row) => {
              const start = new Date(String(row[startDateField.fieldname])).valueOf()
              const end = new Date(String(endDateField ? row[endDateField.fieldname] ?? row[startDateField.fieldname] : row[startDateField.fieldname])).valueOf()
              const width = Math.max(2, ((end - start) / Math.max(1, ganttDates.max - ganttDates.min)) * 100)
              const offset = Math.max(0, ((start - ganttDates.min) / Math.max(1, ganttDates.max - ganttDates.min)) * 100)
              return <button key={row.name} type="button" className="grid min-w-[42rem] grid-cols-[12rem_1fr] items-center gap-3 text-left" onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/${encodeURIComponent(String(row.name))}`)}><span className="truncate text-sm text-ink-gray-8">{String(row.name)}</span><span className="relative h-7 rounded bg-surface-gray-1"><span className="absolute top-1 h-5 rounded bg-surface-blue-5" style={{ left: `${offset}%`, width: `${width}%` }} /></span></button>
            })}
          </div>
        ) : <EmptyState name={__('No date range is available for this DocType')} />
          ) : (
            <EmptyState name={doctype} />
          )}
          <div className="flex justify-end gap-2 border-t border-outline-gray-2 px-4 py-3 sm:px-6">
            {!effectiveDisableCount && <div className="mr-auto self-center text-sm text-ink-gray-6">{__('Showing {0} record(s)', [displayedRows.length])}</div>}
            <Button variant="ghost" disabled={!resource.hasPreviousPage} onClick={() => resource.previous()}>{__('Previous')}</Button>
            <Button variant="ghost" disabled={!resource.hasNextPage} onClick={() => resource.next()}>{__('Next')}</Button>
          </div>
        </div>
      </div>
      {showListSettings && (
        <DeskListSettings
          open={showListSettings}
          onOpenChange={setShowListSettings}
          fields={fields}
          value={{
            fields: effectiveColumnNames ?? fields.map((field) => field.fieldname),
            pageLength: effectivePageLength,
            disableCount: effectiveDisableCount,
            disableSidebar: effectiveDisableSidebar,
          }}
          onApply={applyListSettings}
        />
      )}
      {showEditModal && (
        <EditValueModal
          open={showEditModal}
          onOpenChange={(open) => {
            setShowEditModal(open)
            if (!open) setSelections(new Set())
          }}
          doctype={doctype}
          selectedValues={new Set([...selections].map(String))}
          onReload={() => void resource.reload()}
        />
      )}
      {showAssignmentModal && (
        <AssignmentModal
          open={showAssignmentModal}
          onOpenChange={closeBulkModal}
          assignees={bulkAssignees}
          onAssigneesChange={setBulkAssignees}
          docs={new Set([...selections].map(String))}
          doctype={doctype}
          onReload={() => void resource.reload()}
        />
      )}
    </main>
  )
}
