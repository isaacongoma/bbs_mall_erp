import { __ } from '@/core/i18n'
import { FieldsLayoutModal } from '../FieldsLayoutModal'

export interface GridRowFieldsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype?: string
  parentDoctype?: string
  onReload?: () => void
}

export function GridRowFieldsModal({
  open,
  onOpenChange,
  doctype = 'CRM Lead',
  parentDoctype = '',
  onReload,
}: GridRowFieldsModalProps) {
  return (
    <FieldsLayoutModal
      open={open}
      onOpenChange={onOpenChange}
      layoutType="Grid Row"
      title={__('Edit Grid Row Fields Layout')}
      cacheKey="GridRowFieldsModal"
      doctype={doctype}
      parentDoctype={parentDoctype}
      previewAsGridRow
      onReload={onReload}
    />
  )
}
