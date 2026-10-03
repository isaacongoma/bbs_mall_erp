import { useState, type ComponentType, type ReactNode } from 'react'
import { __ } from '@/core/i18n'
import { router, useRoute } from '@/core/navigation'
import { useObservable } from '@/core/resources'
import { Button, Combobox, Dialog, Dropdown, FormControl, SortableList, Tooltip } from '@/design-system'
import { useIsMobileView } from '../hooks/useIsMobileView'
import { useMeta } from '../hooks/useMeta'
import { useUsers } from '../hooks/useUsers'
import type { ViewController } from '../hooks/useViewController'
import { ColumnSettings } from './ColumnSettings'
import { FadedScrollableDiv } from './FadedScrollableDiv'
import { Filter } from './Filter'
import { GroupBy } from './GroupBy'
import { ExportIcon, QuickFilterIcon } from './Icons'
import { KanbanSettings } from './Kanban'
import { QuickFilterField, type QuickFilter } from './QuickFilterField'
import { SortBy } from './SortBy'
import { ViewModal } from './ViewModal'

export interface LostReasonModalSlotProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype: string
  onSave: (payload: { lost_reason: string; lost_notes: string }) => void
  onCancel: () => void
}

export interface ViewControlsProps {
  controller: ViewController
  lostReasonModal?: ComponentType<LostReasonModalSlotProps>
}

function QuickFilters({ controller }: { controller: ViewController }) {
  return (
    <FadedScrollableDiv className="-ml-1 flex h-9 flex-1 items-center overflow-x-auto" orientation="horizontal">
      {controller.quickFilterList.map((filter) => (
        <div key={filter.fieldname} className="m-1 flex min-w-36 flex-1 items-center [&>*]:w-full">
          <QuickFilterField filter={filter} onApplyQuickFilter={controller.applyQuickFilter} />
        </div>
      ))}
    </FadedScrollableDiv>
  )
}

export function ViewControls({ controller, lostReasonModal: LostReasonModal }: ViewControlsProps) {
  const { list, doctype, options, filters } = controller
  useObservable(list)
  const route = useRoute()
  const isMobileView = useIsMobileView()
  const { isManager } = useUsers()
  const { getFields } = useMeta(doctype)

  const [customizeQuickFilter, setCustomizeQuickFilter] = useState(false)
  const [newQuickFilters, setNewQuickFilters] = useState<QuickFilter[]>([])
  const [savingQuickFilters, setSavingQuickFilters] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportType, setExportType] = useState('Excel')
  const [exportAll, setExportAll] = useState(false)

  const viewType = route.params.viewType
  const hasViewQuery = Boolean(route.query.view)
  const canSaveView = controller.viewUpdated && hasViewQuery && (!controller.viewRecord?.public || isManager())

  function toQuickFilter(source: QuickFilter): QuickFilter {
    return { label: source.label, fieldname: source.fieldname, fieldtype: source.fieldtype }
  }

  function showCustomize() {
    setNewQuickFilters((controller.quickFilters.data ?? []).map(toQuickFilter))
    setCustomizeQuickFilter(true)
  }

  const existingQuickFilters = newQuickFilters.map((filter) => filter.fieldname)
  const quickFilterOptions = (() => {
    const fields = getFields()
    if (!fields) return []
    const result = fields
      .filter((field) => field.label)
      .filter((field) => !existingQuickFilters.includes(field.fieldname))
      .map((field) => ({ label: field.label as string, value: field.fieldname, fieldtype: field.fieldtype }))
    if (!result.some((field) => field.value === 'name') && !existingQuickFilters.includes('name')) {
      result.push({ label: __('Name'), value: 'name', fieldtype: 'Data' })
    }
    return result
  })()

  async function saveQuickFilters() {
    setSavingQuickFilters(true)
    try {
      await controller.saveQuickFilters(newQuickFilters)
      setCustomizeQuickFilter(false)
    } finally {
      setSavingQuickFilters(false)
    }
  }

  function download() {
    controller.exportRows(exportType, exportAll)
    setShowExportDialog(false)
    setExportAll(false)
    setExportType('Excel')
  }

  const refreshButton = (
    <Button
      tooltip={__('Refresh')}
      icon="lucide-refresh-ccw"
      loading={controller.isLoading}
      onClick={() => controller.reload()}
    />
  )

  const toolbar = (hideLabel: boolean): ReactNode => (
    <>
      {viewType === 'group_by' && (
        <GroupBy list={list} doctype={doctype} hideLabel={hideLabel} onUpdate={controller.updateGroupBy} />
      )}
      <Filter list={list} doctype={doctype} defaultFilters={filters} onUpdate={controller.updateFilter} />
      {viewType !== 'kanban' && (
        <SortBy list={list} doctype={doctype} hideLabel={hideLabel} onUpdate={controller.updateSort} />
      )}
      {viewType === 'kanban' ? (
        <KanbanSettings list={list} doctype={doctype} onUpdate={controller.updateKanbanSettings} />
      ) : (
        !options.hideColumnsButton && (
          <ColumnSettings
            list={list}
            doctype={doctype}
            hideLabel={hideLabel}
            onUpdate={(update) => controller.updateColumns(update)}
          />
        )
      )}
    </>
  )

  const saveButtons = (
    <>
      <Button label={__('Cancel')} onClick={controller.cancelChanges} />
      <Button label={__('Save Changes')} onClick={controller.saveView} />
    </>
  )

  let body: ReactNode
  if (isMobileView) {
    body = (
      <div className="flex flex-col justify-between gap-2 px-3 py-4 sm:px-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <QuickFilters controller={controller} />
            <div className="-ml-2 h-[70%] border-l" />
            <div className="flex shrink-0 gap-2">
              {refreshButton}
              {toolbar(true)}
            </div>
          </div>
          {canSaveView && <div className="flex flex-row-reverse items-center gap-2 border-r pr-2">{saveButtons}</div>}
        </div>
      </div>
    )
  } else if (customizeQuickFilter) {
    body = (
      <div className="flex items-center justify-between gap-2 p-5">
        <div className="flex flex-1 items-center gap-2 overflow-hidden pl-1">
          <FadedScrollableDiv className="-ml-1 flex overflow-x-auto" orientation="horizontal">
            <SortableList
              items={newQuickFilters}
              itemKey="fieldname"
              direction="horizontal"
              className="flex w-full items-center gap-2"
              onChange={setNewQuickFilters}
              renderItem={(filter) => (
                <div className="group cursor-grab whitespace-nowrap">
                  <Button
                    className="cursor-grab"
                    suffix={
                      <span
                        className="lucide-x hidden h-3.5 cursor-pointer group-hover:flex"
                        aria-hidden="true"
                        onClick={(event) => {
                          event.stopPropagation()
                          setNewQuickFilters((current) =>
                            current.filter((entry) => entry.fieldname !== filter.fieldname),
                          )
                        }}
                      />
                    }
                  >
                    <Tooltip text={filter.fieldname}>
                      <span>{filter.label}</span>
                    </Tooltip>
                  </Button>
                </div>
              )}
            />
          </FadedScrollableDiv>
          <div>
            <Combobox
              value={null}
              options={quickFilterOptions}
              onSelectedOptionChange={(option) => {
                if (!option || option.type === 'custom') return
                if (newQuickFilters.some((filter) => filter.fieldname === option.value)) return
                setNewQuickFilters((current) => [
                  ...current,
                  { label: option.label, fieldname: String(option.value), fieldtype: String(option.fieldtype) },
                ])
              }}
              trigger={({ open, setOpen }) => (
                <Button
                  className="mr-2 whitespace-nowrap"
                  variant="ghost"
                  label={__('Add Filter')}
                  iconLeft="lucide-plus"
                  onClick={() => setOpen(!open)}
                />
              )}
              itemLabel={({ item }) => (
                <Tooltip text={String(item.value ?? '')} hoverDelay={1}>
                  <div className="flex-1 truncate text-ink-gray-7">{item.label}</div>
                </Tooltip>
              )}
            />
          </div>
        </div>
        <div className="-ml-2 h-[70%] border-l" />
        <div className="flex gap-1">
          <Button label={__('Save')} loading={savingQuickFilters} onClick={() => void saveQuickFilters()} />
          <Button icon="lucide-x" onClick={() => setCustomizeQuickFilter(false)} />
        </div>
      </div>
    )
  } else {
    body = (
      <div className="flex items-center justify-between gap-2 px-5 py-4">
        <QuickFilters controller={controller} />
        <div className="-ml-2 h-[70%] border-l" />
        <div className="flex items-center gap-2">
          {canSaveView && <div className="flex items-center gap-2 border-r pr-2">{saveButtons}</div>}
          <div className="flex items-center gap-2">
            {refreshButton}
            {toolbar(false)}
            {(viewType !== 'kanban' || isManager()) && (
              <Dropdown
                placement="right"
                options={[
                  {
                    group: __('Options'),
                    hideLabel: true,
                    items: [
                      {
                        label: __('Import'),
                        icon: 'lucide-import',
                        onClick: () => router.push({ name: 'NewDataImport', params: { doctype } }),
                        condition: () => !options.hideColumnsButton && viewType !== 'kanban',
                      },
                      {
                        label: __('Export'),
                        icon: ExportIcon,
                        onClick: () => setShowExportDialog(true),
                        condition: () => !options.hideColumnsButton && viewType !== 'kanban',
                      },
                      {
                        label: __('Customize Quick Filters'),
                        icon: QuickFilterIcon,
                        onClick: showCustomize,
                        condition: () => isManager(),
                      },
                    ],
                  },
                ]}
              >
                <Button tooltip={__('More Options')} icon="lucide-more-horizontal" />
              </Dropdown>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {body}
      <ViewModal
        open={controller.showViewModal}
        onOpenChange={controller.setShowViewModal}
        view={controller.viewModalObj}
        onViewChange={controller.setViewModalObj}
        doctype={doctype}
        options={{ afterCreate: controller.afterViewCreate, afterUpdate: controller.afterViewUpdate }}
      />
      <Dialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        title={__('Export')}
        actions={[{ label: __('Download'), variant: 'solid', onClick: download }]}
      >
        <FormControl
          variant="outline"
          label={__('Export Type')}
          type="select"
          value={exportType}
          options={[
            { label: __('Excel'), value: 'Excel' },
            { label: __('CSV'), value: 'CSV' },
          ]}
          placeholder={__('Excel')}
          onChange={(next: unknown) => setExportType(String(next))}
        />
        <div className="mt-3">
          <FormControl
            type="checkbox"
            label={__('Export all {0} record(s)', [list.data?.total_count])}
            value={exportAll}
            onChange={(checked: boolean) => setExportAll(checked)}
          />
        </div>
      </Dialog>
      {LostReasonModal && controller.showKanbanLostReasonModal && (
        <LostReasonModal
          open={controller.showKanbanLostReasonModal}
          onOpenChange={controller.setShowKanbanLostReasonModal}
          doctype={doctype}
          onSave={controller.confirmKanbanLostReason}
          onCancel={controller.cancelKanbanLostReason}
        />
      )}
    </>
  )
}
