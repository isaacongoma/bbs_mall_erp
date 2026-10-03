import { __ } from '@/core/i18n'
import { FieldsLayoutModal } from './FieldsLayoutModal'

export interface DataFieldsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doctype?: string
  onReload?: () => void
}

export function DataFieldsModal({ open, onOpenChange, doctype = 'CRM Lead', onReload }: DataFieldsModalProps) {
  return (
    <FieldsLayoutModal
      open={open}
      onOpenChange={onOpenChange}
      layoutType="Data Fields"
      title={__('Edit Data Fields Layout')}
      cacheKey="DataFieldsModal"
      doctype={doctype}
      onReload={onReload}
    />
  )
}
