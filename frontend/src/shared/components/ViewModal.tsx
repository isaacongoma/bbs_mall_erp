import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, Dialog, FormControl, IconPicker } from '@/design-system'
import type { ViewDefinition } from '../types/view'
import { isEmoji } from '../utils/emoji'

export interface ViewModalOptions {
  afterCreate?: (view: ViewDefinition) => void | Promise<void>
  afterUpdate?: (view: ViewDefinition) => void | Promise<void>
}

export interface ViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: ViewDefinition
  onViewChange: (view: ViewDefinition) => void
  doctype: string
  options?: ViewModalOptions
}

export function ViewModal({ open, onOpenChange, view, onViewChange, doctype, options = {} }: ViewModalProps) {
  const editMode = view.mode === 'edit'
  const duplicateMode = view.mode === 'duplicate'
  const currentIsEmoji = isEmoji(view.icon || '')
  const pickerIcon = !view.icon || isEmoji(view.icon) ? '' : view.icon

  async function create() {
    const payload = { ...view, doctype }
    const created = await rpc<ViewDefinition>({
      url: 'crm.fcrm.doctype.crm_view_settings.crm_view_settings.create',
      params: { view: payload },
    })
    onOpenChange(false)
    await options.afterCreate?.(created)
  }

  async function update() {
    const payload = { ...view, doctype }
    await rpc({
      url: 'crm.fcrm.doctype.crm_view_settings.crm_view_settings.update',
      params: { view: payload },
    })
    onOpenChange(false)
    await options.afterUpdate?.(payload)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editMode ? __('Edit View') : duplicateMode ? __('Duplicate View') : __('Create View')}
      actionsContent={() => (
        <div className="flex justify-end">
          <Button
            variant="solid"
            disabled={!view.label?.trim()}
            label={editMode ? __('Save Changes') : duplicateMode ? __('Duplicate') : __('Create')}
            onClick={() => void (editMode ? update() : create())}
          />
        </div>
      )}
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 block text-base text-ink-gray-5">{__('View Name')}</div>
          <FormControl
            size="md"
            type="text"
            placeholder={__('My Open Deals')}
            value={view.label}
            onChange={(label: string) => onViewChange({ ...view, label })}
          />
        </div>
        <div>
          <div className="mb-1.5 block text-base text-ink-gray-5">{__('Icon')}</div>
          <div className="flex items-center gap-2">
            {currentIsEmoji && (
              <div
                className="grid size-8 shrink-0 place-items-center rounded bg-surface-gray-3 text-lg leading-none"
                title={__('Current icon')}
              >
                {view.icon}
              </div>
            )}
            <IconPicker
              value={pickerIcon}
              maxIcons={1000}
              placeholder={currentIsEmoji ? __('Replace with an icon...') : __('Select an icon...')}
              onChange={(icon) => onViewChange({ ...view, icon: icon || '' })}
            />
          </div>
        </div>
      </div>
    </Dialog>
  )
}
