import { useState } from 'react'
import { __ } from '@/core/i18n'
import { useObservable } from '@/core/resources'
import { Button, Combobox } from '@/design-system'
import { useGroupByOptions, type GroupByOption } from '../hooks/useGroupByOptions'
import type { ViewListResource } from '../types/view'
import { DetailsIcon } from './Icons'

export interface GroupByProps {
  list: ViewListResource
  doctype: string
  hideLabel?: boolean
  onUpdate: (fieldname: string) => void
}

const EMPTY = { label: '', fieldname: '' }

export function GroupBy({ list, doctype, hideLabel = false, onUpdate }: GroupByProps) {
  useObservable(list)
  const groupByOptions = useGroupByOptions(doctype)
  const dataGroupBy: GroupByOption | undefined = list.data?.group_by_field

  const [selected, setSelected] = useState<GroupByOption | null>(null)
  const [syncedDataGroupBy, setSyncedDataGroupBy] = useState<GroupByOption | undefined>(dataGroupBy)
  if (syncedDataGroupBy !== dataGroupBy) {
    setSyncedDataGroupBy(dataGroupBy)
    if (dataGroupBy) setSelected(dataGroupBy)
  }

  const groupByValue = selected ?? dataGroupBy ?? EMPTY

  const options = (() => {
    if (!groupByOptions) return []
    const data = dataGroupBy
      ? groupByOptions.filter((option) => option.fieldname !== groupByValue.fieldname)
      : groupByOptions
    return data.map((option) => ({ ...option, value: option.fieldname }))
  })()

  return (
    <Combobox
      options={options}
      value={null}
      onSelectedOptionChange={(option) => {
        const data = option as unknown as GroupByOption | null
        if (!data?.fieldname || (option as { type?: string }).type === 'custom') return
        setSelected(data)
        onUpdate(data.fieldname)
      }}
      trigger={({ open, setOpen }) => (
        <Button
          label={hideLabel ? groupByValue.label : `${__('Group By: ')}${groupByValue.label}`}
          iconLeft={DetailsIcon}
          iconRight={open ? 'lucide-chevron-up' : 'lucide-chevron-down'}
          onClick={() => setOpen(!open)}
        />
      )}
    />
  )
}
