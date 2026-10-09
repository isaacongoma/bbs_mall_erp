import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Badge, Button, Checkbox, Dropdown, ErrorMessage, Spinner, cn } from '@/design-system'
import { frappe } from '../frappe'
import { indicatorFor, settingsFilters, type ListViewFacade } from '../frappe/listView'
import { useMeta } from '../hooks/useMeta'
import { tableField, useReportviewList } from '../hooks/useReportviewList'
import { currentSessionUser } from '../stores/usersStore'
import type { DocField } from '../types/meta'
import { downloadCsv } from '../utils/csv'
import { prettyDate } from '../utils/date'
import { indicatorTheme } from '../utils/indicatorTheme'
import { sanitizeHTML } from '../utils/text'
import { renderFieldLayoutDialog } from '../utils/renderFieldLayoutDialog'
import { AssignmentModal, type Assignee } from './AssignmentModal'
import { DeskListSettings, type DeskListSettingsValue } from './DeskListSettings'
import { FilterPopover, SortControl } from './DeskListFilters'
import { filterable, selectOptions, toReportviewFilters, type ListFilter } from '../utils/listFilters'
import { EditValueModal } from './EditValueModal'
import { Icon } from './Icon'
import { Link } from './Controls/Link'
import { LayoutHeader } from './LayoutHeader'

type AnyRecord = Record<string, any>

interface DeskTableListProps {
  doctype: string
  viewSettings: AnyRecord
  facade: ListViewFacade | null
  routeFilters: Record<string, string>
  viewLinks: Array<{ label: string; icon: string; to: string }>
  savedFields?: string[]
}

interface StandardValue {
  value: string
  like: boolean
}

const PAGE_SIZES = [20, 100, 500, 2500]
const TEXT_TYPES = [
  'Data',
  'Small Text',
  'Text',
  'Long Text',
  'Text Editor',
  'Code',
  'Read Only',
  'Phone',
  'Autocomplete',
  'Barcode',
]
const SORTABLE_TYPES = [
  'Data',
  'Select',
  'Link',
  'Date',
  'Datetime',
  'Int',
  'Float',
  'Currency',
  'Percent',
  'Check',
  'Dynamic Link',
  'Time',
  'Small Text',
]

function standardFilterFields(fields: DocField[], titleField: string): DocField[] {
  return fields.filter(
    (field) =>
      (field.in_standard_filter || (titleField && field.fieldname === titleField)) &&
      ['Data', 'Select', 'Link', 'Check', 'Date', 'Datetime', 'Int', 'Float', 'Currency', 'Dynamic Link'].includes(
        field.fieldtype,
      ),
  )
}

function likedBy(row: AnyRecord): string[] {
  try {
    const parsed = JSON.parse(String(row._liked_by ?? '[]')) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function cellText(field: DocField | undefined, value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (field && field.fieldtype === 'Check') return Number(value) ? __('Yes') : __('No')
  if (field && (field.fieldtype === 'Date' || field.fieldtype === 'Datetime') && typeof frappe.datetime?.str_to_user === 'function') {
    return String(frappe.datetime.str_to_user(String(value)))
  }
  return String(value)
}

export function DeskTableList({
  doctype,
  viewSettings,
  facade,
  routeFilters,
  viewLinks,
  savedFields,
}: DeskTableListProps) {
  const navigate = useNavigate()
  const meta = useMeta(doctype)
  const docMeta = meta.doctypeMeta as AnyRecord | null
  const allFields = useMemo(() => meta.getFields({ restrictNoValueFields: false }) as DocField[], [meta])
  const dataFields = useMemo(() => filterable(allFields), [allFields])
  const titleField = String(docMeta?.title_field ?? '')
  const standardFields = useMemo(() => standardFilterFields(dataFields, titleField), [dataFields, titleField])
  const titleDf = dataFields.find((field) => field.fieldname === titleField)
  const hideName = Boolean(viewSettings.hide_name_column)

  const [standard, setStandard] = useState<Record<string, StandardValue>>({})
  const [customFilters, setFilters] = useState<ListFilter[] | null>(null)
  const defaultFilters = useMemo<ListFilter[]>(() => {
    const configured = Object.entries((settingsFilters(viewSettings) ?? {}) as AnyRecord).map(([field, value]) =>
      Array.isArray(value)
        ? { field, op: String(value[0]), value: Array.isArray(value[1]) ? value[1].join(',') : String(value[1] ?? '') }
        : { field, op: '=', value: String(value ?? '') },
    )
    return [...configured, ...Object.entries(routeFilters).map(([field, value]) => ({ field, op: '=', value }))]
  }, [routeFilters, viewSettings])
  const filters = customFilters ?? defaultFilters
  const [sortField, setSortField] = useState(String(docMeta?.sort_field ?? 'creation'))
  const [descending, setDescending] = useState(String(docMeta?.sort_order ?? 'DESC').toUpperCase() !== 'ASC')
  const [pageLength, setPageLength] = useState(20)
  const [pageSize, setPageSize] = useState(20)
  const [start, setStart] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [frappeMetaReady, setFrappeMetaReady] = useState(false)
  const [likedOnly, setLikedOnly] = useState(false)
  const [columnNames, setColumnNames] = useState<string[] | null>(
    savedFields && savedFields.length ? savedFields : null,
  )
  const [showSettings, setShowSettings] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const user = currentSessionUser() ?? ''

  const listColumns = useMemo(() => {
    const chosen = columnNames
      ? dataFields.filter((field) => columnNames.includes(field.fieldname))
      : dataFields.filter((field) => field.in_list_view)
    return chosen.filter((field) => field.fieldname !== titleField).slice(0, 8)
  }, [columnNames, dataFields, titleField])

  useEffect(() => {
    let cancelled = false
    frappe.model.with_doctype(doctype, () => {
      if (!cancelled) setFrappeMetaReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [doctype])

  const indicatorSupported =
    typeof viewSettings.get_indicator === 'function' ||
    Boolean(docMeta?.is_submittable) ||
    dataFields.some((field) => ['status', 'workflow_state', 'enabled', 'disabled'].includes(field.fieldname))

  const requestFields = useMemo(() => {
    const names = new Set<string>(['name', 'owner', 'creation', 'modified', 'docstatus', '_liked_by'])
    if (titleField) names.add(titleField)
    for (const field of listColumns) names.add(field.fieldname)
    for (const name of ['status', 'workflow_state', 'enabled', 'disabled'])
      if (dataFields.some((field) => field.fieldname === name)) names.add(name)
    for (const name of (viewSettings.add_fields ?? []) as string[]) names.add(name)
    return [...names].map((name) => tableField(doctype, name))
  }, [dataFields, doctype, listColumns, titleField, viewSettings.add_fields])

  const reportFilters = useMemo(() => {
    const list: unknown[] = []
    for (const [fieldname, entry] of Object.entries(standard)) {
      if (!entry.value) continue
      list.push([doctype, fieldname, entry.like ? 'like' : '=', entry.like ? `%${entry.value}%` : entry.value])
    }
    list.push(...toReportviewFilters(doctype, filters))
    if (likedOnly && user) list.push([doctype, '_liked_by', 'like', `%${user}%`])
    return list
  }, [doctype, filters, likedOnly, standard, user])

  const query = docMeta
    ? {
        doctype,
        fields: requestFields,
        filters: reportFilters,
        orderBy: `${tableField(doctype, sortField)} ${descending ? 'desc' : 'asc'}`,
        start,
        pageLength,
      }
    : null
  const list = useReportviewList(query)

  useEffect(() => {
    if (facade) {
      facade.setData(list.rows)
      facade.bind(
        () => list.rows.filter((row) => selected.has(String(row.name))),
        () => list.reload(),
      )
    }
  }, [facade, list, selected])

  const sortOptions = useMemo(() => {
    const options = [
      { label: __('Last Updated On'), value: 'modified' },
      { label: __('Created On'), value: 'creation' },
    ]
    const added = new Set(options.map((option) => option.value))
    const push = (value: string, label: string) => {
      if (added.has(value)) return
      added.add(value)
      options.push({ label, value })
    }
    if (titleDf) push(titleDf.fieldname, __(titleDf.label ?? titleDf.fieldname))
    push('name', __('ID'))
    push('idx', __('Most Used'))
    for (const field of dataFields.filter((entry) => entry.in_list_view || entry.in_standard_filter))
      push(field.fieldname, __(field.label ?? field.fieldname))
    for (const field of dataFields
      .filter((entry) => SORTABLE_TYPES.includes(entry.fieldtype) && !entry.hidden)
      .slice(0, 14))
      push(field.fieldname, __(field.label ?? field.fieldname))
    return options
  }, [dataFields, titleDf])

  const rows = list.rows
  const total = list.total ?? rows.length
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(String(row.name)))

  function setStandardValue(fieldname: string, patch: Partial<StandardValue>) {
    setStart(0)
    setStandard((current) => ({
      ...current,
      [fieldname]: {
        value: '',
        like:
          current[fieldname]?.like ??
          TEXT_TYPES.includes(dataFields.find((field) => field.fieldname === fieldname)?.fieldtype ?? 'Data'),
        ...current[fieldname],
        ...patch,
      },
    }))
  }

  function toggleRow(name: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(name)
      else next.delete(name)
      return next
    })
  }

  async function toggleLike(row: AnyRecord) {
    await rpc({
      url: 'frappe.desk.like.toggle_like',
      method: 'POST',
      params: { doctype, name: String(row.name), add: likedBy(row).includes(user) ? 'No' : 'Yes' },
    })
    list.reload()
  }

  async function deleteSelected() {
    if (!selected.size || !window.confirm(__('Delete the selected documents?'))) return
    await Promise.all(
      [...selected].map((name) => rpc({ url: 'frappe.client.delete', method: 'DELETE', params: { doctype, name } })),
    )
    setSelected(new Set())
    list.reload()
  }

  async function addTagSelected() {
    const values = await renderFieldLayoutDialog({
      title: __('Add Tag'),
      fields: [{ fieldname: 'tag', fieldtype: 'Data', label: __('Tag'), reqd: 1 }],
      submitLabel: __('Add'),
    })
    const tag = String(values?.tag ?? '').trim()
    if (!tag) return
    await Promise.all(
      [...selected].map((name) =>
        rpc({ url: 'frappe.desk.doctype.tag.tag.add_tag', method: 'POST', params: { tag, dt: doctype, dn: name } }),
      ),
    )
    setSelected(new Set())
    list.reload()
  }

  async function workflow(action: 'submit' | 'cancel') {
    if (!window.confirm(__('{0} the selected documents?', [action === 'submit' ? __('Submit') : __('Cancel')]))) return
    await rpc({
      url: 'frappe.desk.doctype.bulk_update.bulk_update.submit_cancel_or_update_docs',
      params: { doctype, docnames: [...selected], action },
    })
    setSelected(new Set())
    list.reload()
  }

  function exportRows() {
    const chosen = selected.size ? rows.filter((row) => selected.has(String(row.name))) : rows
    downloadCsv(`${doctype.replaceAll(' ', '_')}.csv`, chosen, [
      { key: 'name', label: __('ID') },
      ...listColumns.map((field) => ({ key: field.fieldname, label: field.label ?? field.fieldname })),
    ])
  }

  function applyListSettings(value: DeskListSettingsValue) {
    setColumnNames(value.fields)
    setPageLength(value.pageLength)
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

  function addNew() {
    if (docMeta?.quick_entry) void frappe.new_doc(doctype)
    else navigate(`/app/${encodeURIComponent(doctype)}/new`)
  }

  const menuOptions = [
    { label: __('Import'), onClick: () => navigate(`/app/data-import/doctype/${encodeURIComponent(doctype)}`) },
    {
      label: __('User Permissions'),
      onClick: () => navigate(`/app/user-permission?allow=${encodeURIComponent(doctype)}`),
    },
    {
      label: __('Role Permissions Manager'),
      onClick: () => navigate(`/app/permission-manager?doctype=${encodeURIComponent(doctype)}`),
    },
    {
      label: __('Customize Quick Filters'),
      onClick: () => navigate(`/app/customize-form?doc_type=${encodeURIComponent(doctype)}`),
    },
    { label: __('List Settings'), onClick: () => setShowSettings(true) },
    ...(facade?.menuItems ?? []).map((entry) => ({ label: __(entry.label), onClick: () => void entry.action() })),
    {
      label: __('Documentation'),
      icon: 'lucide-external-link',
      onClick: () =>
        window.open(
          `https://docs.frappe.io/erpnext/${encodeURIComponent(doctype.toLowerCase().replaceAll(' ', '-'))}`,
          '_blank',
          'noreferrer',
        ),
    },
  ]

  const viewOptions = [
    { label: __('List View'), icon: 'lucide-list', onClick: () => navigate(`/app/${encodeURIComponent(doctype)}`) },
    ...viewLinks.map((view) => ({ label: view.label, icon: view.icon, onClick: () => navigate(view.to) })),
  ]

  const bulkOptions = [
    { label: __('Edit'), onClick: () => setShowEdit(true) },
    {
      label: __('Assign To'),
      onClick: () => {
        setAssignees([])
        setShowAssign(true)
      },
    },
    { label: __('Add Tags'), onClick: () => void addTagSelected() },
    ...(docMeta?.is_submittable
      ? [
          { label: __('Submit'), onClick: () => void workflow('submit') },
          { label: __('Cancel'), onClick: () => void workflow('cancel') },
        ]
      : []),
    { label: __('Export'), onClick: exportRows },
    ...(facade?.actionItems ?? []).map((entry) => ({ label: __(entry.label), onClick: () => void entry.action() })),
    { label: __('Delete'), theme: 'red' as const, onClick: () => void deleteSelected() },
  ]

  const subjectLabel = titleDf ? __(titleDf.label ?? titleDf.fieldname) : __('ID')
  const columnTemplate = `minmax(0,0.83fr) ${indicatorSupported ? 'minmax(0,1fr) ' : ''}${listColumns.map(() => 'minmax(0,1fr)').join(' ')} ${titleDf && !hideName ? 'minmax(0,1fr) ' : ''}160px`

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <LayoutHeader
        className="h-12"
        left={<h1 className="text-lg-medium text-ink-gray-9">{__(doctype)}</h1>}
        right={
          <div className="flex items-center gap-2">
            <Dropdown options={viewOptions} placement="right">
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-lg bg-surface-gray-2 px-3 text-base text-ink-gray-8 hover:bg-surface-gray-3"
              >
                <Icon icon="lucide-list" className="size-4" />
                <span>{__('List View')}</span>
                <Icon icon="lucide-chevrons-up-down" className="size-4 text-ink-gray-6" />
              </button>
            </Dropdown>
            {(facade?.buttonGroups ?? []).map((group) => (
              <Dropdown
                key={group.label}
                placement="right"
                options={group.items.map((item) => ({ label: __(item.label), onClick: () => void item.action() }))}
              >
                {() => <Button label={__(group.label)} variant="subtle" iconRight="lucide-chevrons-up-down" />}
              </Dropdown>
            ))}
            {facade?.innerButtons.map((entry) => (
              <Button key={entry.label} variant="subtle" label={__(entry.label)} onClick={() => void entry.action()} />
            ))}
            <button
              type="button"
              aria-label={__('Refresh')}
              onClick={list.reload}
              className="flex size-8 items-center justify-center rounded-lg bg-surface-gray-2 hover:bg-surface-gray-3"
            >
              <Icon icon="lucide-refresh-cw" className={cn('size-4', list.loading && 'animate-spin')} />
            </button>
            <Dropdown options={menuOptions} placement="right">
              <button
                type="button"
                aria-label={__('Menu')}
                className="flex size-8 items-center justify-center rounded-lg bg-surface-gray-2 hover:bg-surface-gray-3"
              >
                <Icon icon="lucide-ellipsis" className="size-4" />
              </button>
            </Dropdown>
            <Button
              variant="solid"
              iconLeft="lucide-plus"
              label={`${__('Add')} ${__(doctype)}`}
              onClick={() => addNew()}
            />
          </div>
        }
      />
      <div className="flex items-start gap-2 px-[15px] pb-1 pt-[13px]">
        <div className="flex min-w-0 flex-1 flex-wrap gap-x-[10px] gap-y-4">
          {[
            { fieldname: 'name', label: __('ID'), fieldtype: 'Data' } as DocField,
            ...standardFields.filter((field) => field.fieldtype !== 'Check'),
            ...standardFields.filter((field) => field.fieldtype === 'Check'),
          ].map((field) => {
            const current = standard[field.fieldname] ?? { value: '', like: TEXT_TYPES.includes(field.fieldtype) }
            const textual = TEXT_TYPES.includes(field.fieldtype) || field.fieldname === 'name'
            const label = __(field.label ?? field.fieldname)
            const box = 'h-7 w-[148px] rounded-md bg-surface-gray-2 px-2 py-0 text-base leading-7 text-ink-gray-8'
            if (field.fieldtype === 'Check') {
              return (
                <label
                  key={field.fieldname}
                  className="flex w-[148px] cursor-pointer items-start gap-2 text-[13px] font-medium leading-5 text-ink-gray-9"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(Number(current.value))}
                    onChange={(event) => setStandardValue(field.fieldname, { value: event.target.checked ? '1' : '' })}
                    className="mt-[3px] size-[14px] shrink-0"
                  />
                  <span>{label}</span>
                </label>
              )
            }
            if (field.fieldtype === 'Select') {
              return (
                <div key={field.fieldname} className="relative w-[148px]">
                  <select
                    aria-label={label}
                    value={current.value}
                    onChange={(event) => setStandardValue(field.fieldname, { value: event.target.value })}
                    className={cn(
                      box,
                      'appearance-none border-0 pr-6 focus:ring-0',
                      !current.value && 'text-ink-gray-4',
                    )}
                  >
                    {selectOptions(field).map((option, index) => (
                      <option key={index} value={option.value}>
                        {index === 0 ? label : option.label}
                      </option>
                    ))}
                  </select>
                  <Icon
                    icon="lucide-chevrons-up-down"
                    className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-ink-gray-5"
                  />
                </div>
              )
            }
            if (field.fieldtype === 'Link' && field.options) {
              return (
                <div key={field.fieldname} className="w-[148px]">
                  <Link
                    doctype={String(field.options)}
                    value={current.value}
                    placeholder={label}
                    onChange={(value: unknown) =>
                      setStandardValue(field.fieldname, { value: String(value ?? ''), like: false })
                    }
                    target={({ togglePopover }) => (
                      <button
                        type="button"
                        onClick={() => togglePopover()}
                        className={cn(box, 'truncate text-left', !current.value && 'text-ink-gray-4')}
                      >
                        {current.value || label}
                      </button>
                    )}
                  />
                </div>
              )
            }
            return (
              <div
                key={field.fieldname}
                className="flex h-7 w-[148px] items-center overflow-hidden rounded-md bg-surface-gray-2"
              >
                <input
                  value={current.value}
                  placeholder={label}
                  type="text"
                  onFocus={(event) => {
                    if (field.fieldtype === 'Date') event.currentTarget.type = 'date'
                  }}
                  onBlur={(event) => {
                    if (field.fieldtype === 'Date' && !event.currentTarget.value) event.currentTarget.type = 'text'
                  }}
                  onChange={(event) => setStandardValue(field.fieldname, { value: event.target.value })}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-base text-ink-gray-8 placeholder:text-ink-gray-4 focus:ring-0"
                />
                {textual && (
                  <button
                    type="button"
                    title={current.like ? __('Like') : __('Equals')}
                    onClick={() => setStandardValue(field.fieldname, { like: !current.like })}
                    className={cn(
                      'flex h-full w-[33px] items-center justify-center border-l border-outline-gray-3 text-ink-gray-7 hover:bg-surface-gray-3',
                      !current.like && 'text-ink-gray-5',
                    )}
                  >
                    <Icon icon={current.like ? 'lucide-equal-approximately' : 'lucide-equal'} className="size-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <FilterPopover
            fields={dataFields}
            filters={filters}
            count={filters.length}
            onApply={(next) => {
              setStart(0)
              setFilters(next)
            }}
          />
          <SortControl
            options={sortOptions}
            field={sortField}
            descending={descending}
            onChange={(field, desc) => {
              setSortField(field)
              setDescending(desc)
            }}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.error ? (
          <ErrorMessage message={list.error} />
        ) : (
          <div className="flex h-full min-w-[760px] flex-col">
            <div
              className={cn(
                'grid items-center rounded-lg bg-surface-gray-2 px-2 py-2 text-base text-ink-gray-7',
                !list.loading && !rows.length && 'hidden',
              )}
              style={{ gridTemplateColumns: `28px ${columnTemplate}` }}
            >
              <Checkbox
                value={allSelected}
                onChange={(checked) => setSelected(checked ? new Set(rows.map((row) => String(row.name))) : new Set())}
              />
              {selected.size > 0 ? (
                <div className="col-span-full col-start-2 flex items-center justify-between">
                  <span>{__('{0} items selected', [String(selected.size)])}</span>
                  <Dropdown options={bulkOptions} placement="right">
                    <button
                      type="button"
                      className="flex h-7 items-center gap-1 rounded-md bg-surface-white px-3 text-base text-ink-gray-8 shadow-sm"
                    >
                      {__('Actions')}
                      <Icon icon="lucide-chevron-down" className="size-4" />
                    </button>
                  </Dropdown>
                </div>
              ) : (
                <>
                  <span className="relative truncate px-2 after:absolute after:right-0 after:top-1/2 after:h-4 after:w-px after:-translate-y-1/2 after:bg-outline-gray-3">
                    {subjectLabel}
                  </span>
                  {indicatorSupported && (
                    <span className="relative truncate px-2 after:absolute after:right-0 after:top-1/2 after:h-4 after:w-px after:-translate-y-1/2 after:bg-outline-gray-3">
                      {__('Status')}
                    </span>
                  )}
                  {listColumns.map((field) => (
                    <span
                      key={field.fieldname}
                      className="relative truncate px-2 after:absolute after:right-0 after:top-1/2 after:h-4 after:w-px after:-translate-y-1/2 after:bg-outline-gray-3"
                    >
                      {__(field.label ?? field.fieldname)}
                    </span>
                  ))}
                  {titleDf && !hideName && (
                    <span className="relative truncate px-2 after:absolute after:right-0 after:top-1/2 after:h-4 after:w-px after:-translate-y-1/2 after:bg-outline-gray-3">
                      {__('ID')}
                    </span>
                  )}
                  <span className="flex items-center justify-end gap-2 px-2 text-ink-gray-7">
                    <span>
                      {rows.length} {__('of')} {total}
                    </span>
                    <button
                      type="button"
                      aria-label={__('Liked by me')}
                      onClick={() => setLikedOnly((value) => !value)}
                    >
                      <Icon icon="lucide-heart" className={cn('size-4', likedOnly && 'fill-current text-ink-red-4')} />
                    </button>
                  </span>
                </>
              )}
            </div>
            {list.loading && !rows.length && (
              <div className="flex justify-center py-16">
                <Spinner size="md" />
              </div>
            )}
            {!list.loading && !rows.length && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-surface-gray-2">
                  <Icon icon={`lucide-${String(docMeta?.icon || 'file-text')}`} className="size-5 text-ink-gray-5" />
                </span>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-base font-medium text-ink-gray-8">
                    {filters.length ? __('No {0} found', [__(doctype)]) : __('No {0} created', [__(doctype)])}
                  </div>
                  <div className="max-w-xs text-[13px] leading-5 text-ink-gray-5">
                    {filters.length
                      ? __('Clear the filters to see all records.')
                      : docMeta?.description
                        ? __(String(docMeta.description))
                        : __('Create your first {0} to get started.', [__(doctype)])}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button variant="subtle" iconLeft="lucide-plus" label={__('Create')} onClick={() => addNew()} />
                  <Button
                    variant="subtle"
                    iconLeft="lucide-download"
                    label={__('Import')}
                    onClick={() => navigate(`/app/data-import/doctype/${encodeURIComponent(doctype)}`)}
                  />
                  {docMeta?.documentation ? (
                    <Button
                      variant="outline"
                      iconLeft="lucide-external-link"
                      label={__('Documentation')}
                      onClick={() => window.open(String(docMeta.documentation), '_blank', 'noreferrer')}
                    />
                  ) : null}
                </div>
              </div>
            )}
            {rows.map((row) => {
              const name = String(row.name)
              const indicator = indicatorSupported
                ? (indicatorFor(viewSettings, row) ??
                  (frappeMetaReady && frappe.get_indicator?.(row, doctype)
                    ? {
                        label: String(frappe.get_indicator(row, doctype)[0]),
                        color: String(frappe.get_indicator(row, doctype)[1] ?? 'gray'),
                      }
                    : null))
                : null
              const liked = likedBy(row).includes(user)
              return (
                <div
                  key={name}
                  className="grid cursor-pointer items-center border-b border-outline-gray-1 px-2 py-2.5 text-base text-ink-gray-7 hover:bg-surface-gray-1"
                  style={{ gridTemplateColumns: `28px ${columnTemplate}` }}
                  onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)}
                >
                  <span onClick={(event) => event.stopPropagation()}>
                    <Checkbox value={selected.has(name)} onChange={(checked) => toggleRow(name, checked)} />
                  </span>
                  <span className="truncate px-2 text-ink-gray-9" style={{ fontWeight: 600 }}>
                    {titleDf ? String(row[titleDf.fieldname] ?? name) : name}
                  </span>
                  {indicatorSupported && (
                    <span className="px-2">
                      {indicator && <Badge label={__(indicator.label)} theme={indicatorTheme(indicator.color)} />}
                    </span>
                  )}
                  {listColumns.map((field) => {
                    const formatter = viewSettings.formatters?.[field.fieldname]
                    if (typeof formatter === 'function') {
                      return (
                        <span
                          key={field.fieldname}
                          className="truncate px-2"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHTML(
                              String(formatter(row[field.fieldname], { fieldname: field.fieldname }, row) ?? ''),
                            ),
                          }}
                        />
                      )
                    }
                    if (field.fieldtype === 'Check') {
                      return (
                        <span key={field.fieldname} className="px-2">
                          <Checkbox value={Boolean(Number(row[field.fieldname]))} disabled />
                        </span>
                      )
                    }
                    if (field.fieldtype === 'Select' && row[field.fieldname]) {
                      const value = String(row[field.fieldname])
                      return (
                        <span key={field.fieldname} className="px-2">
                          <Badge
                            label={__(value)}
                            theme={indicatorTheme(String(frappe.utils?.guess_colour?.(value) ?? 'gray'))}
                          />
                        </span>
                      )
                    }
                    return (
                      <span key={field.fieldname} className="truncate px-2">
                        {cellText(field, row[field.fieldname])}
                      </span>
                    )
                  })}
                  {titleDf && !hideName && <span className="truncate px-2">{name}</span>}
                  <span
                    className="flex items-center justify-end gap-3 px-2 text-sm text-ink-gray-6"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span title={String(row.modified ?? '')}>{prettyDate(String(row.modified ?? ''), true)}</span>
                    <span className="flex items-center gap-1">
                      <Icon icon="lucide-message-circle" className="size-4" />
                      {Number(row._comment_count ?? 0)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      aria-label={liked ? __('Unlike') : __('Like')}
                      onClick={() => void toggleLike(row)}
                    >
                      <Icon icon="lucide-heart" className={cn('size-4', liked && 'fill-current text-ink-red-4')} />
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div
        className={cn(
          'flex items-center justify-between border-t border-outline-gray-2 px-4 py-3 sm:px-5',
          !list.loading && !rows.length && start === 0 && 'hidden',
        )}
      >
        <div className="flex items-center gap-1 rounded-lg bg-surface-gray-2 p-0.5">
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                setPageSize(size)
                setPageLength(size)
                setStart(0)
              }}
              className={cn(
                'rounded-md px-3 py-1 text-base text-ink-gray-7',
                pageSize === size && 'bg-surface-white text-ink-gray-9 shadow-sm',
              )}
            >
              {size}
            </button>
          ))}
        </div>
        {rows.length < total && (
          <Button variant="subtle" label={__('Load More')} onClick={() => setPageLength(pageLength + pageSize)} />
        )}
      </div>
      <DeskListSettings
        open={showSettings}
        onOpenChange={setShowSettings}
        fields={dataFields}
        value={{
          fields: listColumns.map((field) => field.fieldname),
          pageLength,
          disableCount: false,
          disableSidebar: false,
        }}
        onApply={applyListSettings}
      />
      <EditValueModal
        open={showEdit}
        onOpenChange={setShowEdit}
        doctype={doctype}
        selectedValues={selected}
        onReload={() => {
          setSelected(new Set())
          list.reload()
        }}
      />
      <AssignmentModal
        open={showAssign}
        onOpenChange={setShowAssign}
        assignees={assignees}
        onAssigneesChange={setAssignees}
        docs={selected}
        doctype={doctype}
        onReload={() => {
          setSelected(new Set())
          list.reload()
        }}
      />
    </main>
  )
}
