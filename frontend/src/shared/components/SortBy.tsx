import { __ } from '@/core/i18n'
import { useObservable } from '@/core/resources'
import { Button, Combobox, Popover, SortableList } from '@/design-system'
import { useSortOptions, type SortOption } from '../hooks/useSortOptions'
import type { ViewListResource } from '../types/view'
import { AscendingIcon, DesendingIcon, DragIcon, SortIcon } from './Icons'

export interface SortByProps {
  list: ViewListResource
  doctype: string
  hideLabel?: boolean
  onUpdate: (orderBy: string) => void
}

interface SortValue {
  fieldname: string
  direction: string
}

function toString(values: SortValue[]): string {
  return values.map((value) => `${value.fieldname} ${value.direction}`).join(', ')
}

export function SortBy({ list, doctype, hideLabel = false, onUpdate }: SortByProps) {
  useObservable(list)
  const allSortOptions = useSortOptions(doctype)

  const sortValues: SortValue[] = (() => {
    if (!list.data) return []
    const orderBy: string | undefined = list.params?.order_by
    if (!orderBy || !allSortOptions.length) return []
    if (orderBy.trim() === 'modified desc') return []
    return orderBy.split(', ').map((entry) => {
      const [fieldname, direction] = entry.split(' ')
      return { fieldname: fieldname!, direction: direction! }
    })
  })()

  const selectedNames = sortValues.map((sort) => sort.fieldname)
  const options: SortOption[] = !allSortOptions.length
    ? []
    : !sortValues.length
      ? allSortOptions
      : allSortOptions.filter((option) => !selectedNames.includes(option.fieldname))

  const apply = (next: SortValue[]) => onUpdate(toString(next))

  const toggleDirection = (index: number) =>
    apply(
      sortValues.map((sort, i) =>
        i === index ? { ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' } : sort,
      ),
    )

  function setSort(data: SortOption | null) {
    if (!data) return
    apply([...sortValues, { fieldname: data.fieldname, direction: 'asc' }])
  }

  function updateSort(data: SortOption, index: number) {
    apply(sortValues.map((sort, i) => (i === index ? { fieldname: data.fieldname, direction: sort.direction } : sort)))
  }

  function sortLabel(): string {
    if (!sortValues.length) return __('Sort')
    const first = sortValues[0]!
    return allSortOptions.find((option) => option.fieldname === first.fieldname)?.label || first.fieldname
  }

  const selectHandler = (handler: (option: SortOption) => void) => (option: unknown) => {
    const selected = option as { type?: string } | null
    if (selected && selected.type !== 'custom') handler(option as SortOption)
  }

  if (!sortValues.length) {
    return (
      <Combobox
        options={options}
        value={null}
        placeholder={__('First Name')}
        onSelectedOptionChange={selectHandler(setSort)}
        trigger={({ open, setOpen }) => (
          <Button
            label={hideLabel ? undefined : __('Sort')}
            icon={hideLabel ? SortIcon : undefined}
            iconLeft={hideLabel ? undefined : SortIcon}
            onClick={() => setOpen(!open)}
          />
        )}
      />
    )
  }

  return (
    <Popover
      placement="bottom-end"
      target={({ isOpen, togglePopover }) =>
        sortValues.length > 1 ? (
          <Button
            label={hideLabel ? undefined : __('Sort')}
            icon={hideLabel ? SortIcon : undefined}
            iconLeft={hideLabel ? undefined : SortIcon}
            onClick={() => togglePopover()}
            suffix={
              <div className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-surface-base pt-px text-xs-medium text-ink-gray-8 shadow-sm">
                {sortValues.length}
              </div>
            }
          />
        ) : (
          <div className="flex items-center justify-center">
            <Button
              className="rounded-r-none border-r"
              icon={sortValues[0]!.direction === 'asc' ? AscendingIcon : DesendingIcon}
              onClick={(event) => {
                event.stopPropagation()
                toggleDirection(0)
              }}
            />
            <Button
              label={sortLabel()}
              className="shrink-0 rounded-l-none [&_svg]:text-ink-gray-5"
              iconRight={isOpen ? 'lucide-chevron-up' : 'lucide-chevron-down'}
              onClick={(event) => {
                event.stopPropagation()
                togglePopover()
              }}
            />
          </div>
        )
      }
      body={({ close }) => (
        <div className="my-2 min-w-40 rounded-lg bg-surface-elevation-2 shadow-2xl ring-1 ring-black/5 focus:outline-none">
          <div className="min-w-60 p-2">
            <SortableList
              items={sortValues}
              itemKey="fieldname"
              useHandle
              className="mb-3 flex flex-col gap-2"
              onChange={apply}
              renderItem={(sort, { index, handle }) => (
                <div className="flex items-center gap-1">
                  <div
                    className="handle flex h-7 w-7 items-center justify-center"
                    {...handle.attributes}
                    {...handle.listeners}
                  >
                    <DragIcon className="h-4 w-4 cursor-grab text-ink-gray-5" />
                  </div>
                  <div className="flex flex-1">
                    <Button
                      size="md"
                      className="rounded-r-none border-r"
                      icon={sort.direction === 'asc' ? AscendingIcon : DesendingIcon}
                      onClick={() => toggleDirection(index)}
                    />
                    <Combobox
                      className="[&>_div]:w-full"
                      value={sort.fieldname}
                      options={allSortOptions}
                      placeholder={__('First Name')}
                      onSelectedOptionChange={selectHandler((option) => updateSort(option, index))}
                      trigger={({ open, setOpen, displayValue }) => (
                        <Button
                          className="flex w-full items-center justify-between rounded-l-none !text-ink-gray-5"
                          size="md"
                          label={displayValue}
                          iconRight={open ? 'lucide-chevron-down' : 'lucide-chevron-up'}
                          onClick={() => setOpen(!open)}
                        />
                      )}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    icon="lucide-x"
                    onClick={() => apply(sortValues.filter((_, i) => i !== index))}
                  />
                </div>
              )}
            />
            <div className="flex items-center justify-between gap-2">
              <Combobox
                options={options}
                value={null}
                placeholder={__('First Name')}
                onSelectedOptionChange={selectHandler(setSort)}
                trigger={({ open, setOpen }) => (
                  <Button
                    className="!text-ink-gray-5"
                    label={__('Add Sort')}
                    variant="ghost"
                    iconLeft="lucide-plus"
                    onClick={() => setOpen(!open)}
                  />
                )}
              />
              <Button
                className="!text-ink-gray-5"
                variant="ghost"
                label={__('Clear Sort')}
                onClick={() => {
                  apply([])
                  close()
                }}
              />
            </div>
          </div>
        </div>
      )}
    />
  )
}
