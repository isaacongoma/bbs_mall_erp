import { __ } from '@/core/i18n'
import { useResource } from '@/core/resources'
import { Button, Dialog } from '@/design-system'
import { useUsers } from '../../hooks/useUsers'
import { EditIcon } from '../Icons'
import { FieldLayout, type LayoutTab } from '../FieldLayout'
import type { DocRecord } from '../../types/meta'

export interface GridRowModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditFieldsLayout: () => void
  index?: number
  data?: DocRecord
  doctype?: string
  parentDoctype?: string
  parentFieldname?: string
}

export function GridRowModal({
  open,
  onOpenChange,
  onEditFieldsLayout,
  index = 0,
  data = {},
  doctype = '',
  parentDoctype = '',
}: GridRowModalProps) {
  const { isManager } = useUsers()

  const tabs = useResource<LayoutTab[]>({
    url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
    cache: ['Grid Row', doctype, parentDoctype],
    params: { doctype, type: 'Grid Row', parent_doctype: parentDoctype },
    auto: true,
  })

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="4xl"
      body={
        <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{__('Editing Row {0}', [index + 1])}</h3>
            </div>
            <div className="flex items-center gap-1">
              {isManager() && (
                <Button
                  tooltip={__('Edit Fields Layout')}
                  variant="ghost"
                  className="w-7"
                  icon={EditIcon}
                  onClick={onEditFieldsLayout}
                />
              )}
              <Button icon="lucide-x" variant="ghost" className="w-7" onClick={() => onOpenChange(false)} />
            </div>
          </div>
          <div>{tabs.data && <FieldLayout tabs={tabs.data} data={data} doctype={doctype} isGridRow />}</div>
        </div>
      }
    />
  )
}
