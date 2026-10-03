import { __ } from '@/core/i18n'
import { TemplateOption } from './optionComponents'

export interface ConfirmDeleteConfig {
  isConfirmingDelete: boolean
  setConfirmingDelete: (value: boolean) => void
  onConfirmDelete: () => void
  label?: string
}

export function confirmDeleteOptions({
  isConfirmingDelete,
  setConfirmingDelete,
  onConfirmDelete,
  label = __('Delete'),
}: ConfirmDeleteConfig) {
  const confirmLabel = __('Confirm {0}', [label])
  return [
    {
      label,
      component: ({ active }: { active?: boolean }) => (
        <TemplateOption
          option={label}
          icon="trash-2"
          active={active}
          variant="grey"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setConfirmingDelete(true)
          }}
        />
      ),
      condition: () => !isConfirmingDelete,
    },
    {
      label: confirmLabel,
      component: ({ active }: { active?: boolean }) => (
        <TemplateOption
          option={confirmLabel}
          icon="trash-2"
          active={active}
          variant="danger"
          onClick={() => {
            onConfirmDelete()
            setConfirmingDelete(false)
          }}
        />
      ),
      condition: () => isConfirmingDelete,
    },
  ]
}
