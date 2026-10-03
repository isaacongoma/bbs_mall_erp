import { useRef, useState, type HTMLAttributes } from 'react'
import { __ } from '@/core/i18n'
import { Button, FormControl, Switch, Tooltip, cn } from '@/design-system'
import { DragVerticalIcon } from '@/shared/components/Icons'
import { fieldTypeIcon, fieldTypeLabel, type FormField } from '../../utils/formBuilder'

export interface FieldCardProps {
  field: FormField
  expanded: boolean
  locked: boolean
  guestSelectMissing: boolean
  granting: boolean
  handleProps: HTMLAttributes<HTMLElement>
  onOpen: () => void
  onToggle: () => void
  onRemove: () => void
  onUpdate: (patch: Partial<FormField>) => void
  onGrantGuest: () => void
}

const RULE_PLACEHOLDER = 'eval:doc.fieldname == "value"'

export function FieldCard({
  field,
  expanded,
  locked,
  guestSelectMissing,
  granting,
  handleProps,
  onOpen,
  onToggle,
  onRemove,
  onUpdate,
  onGrantGuest,
}: FieldCardProps) {
  const [editingLabel, setEditingLabel] = useState(false)
  const labelInput = useRef<HTMLInputElement | null>(null)

  function beginEdit() {
    setEditingLabel(true)
    onOpen()
    requestAnimationFrame(() => labelInput.current?.focus())
  }

  return (
    <div
      className={cn(
        'rounded border bg-surface-elevation-2 text-ink-gray-8',
        expanded ? 'border-outline-gray-3' : 'border-outline-gray-2',
      )}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span {...handleProps} className="drag-handle shrink-0 cursor-grab">
          <DragVerticalIcon className="h-3.5 text-ink-gray-4" />
        </span>
        <span
          className={cn(fieldTypeIcon(field), 'h-4 w-4 shrink-0 text-ink-gray-5')}
          title={fieldTypeLabel(field)}
          aria-hidden="true"
        />
        {editingLabel ? (
          <input
            ref={labelInput}
            value={field.label}
            placeholder={field.fieldname}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink-gray-8 placeholder:text-ink-gray-4 focus:outline-none focus:ring-0"
            onChange={(event) => onUpdate({ label: event.target.value })}
            onBlur={() => setEditingLabel(false)}
            onKeyDown={(event) => event.key === 'Enter' && setEditingLabel(false)}
          />
        ) : (
          <div
            className="group/label flex min-w-0 flex-1 cursor-text items-center"
            title={__('Click to rename')}
            onClick={beginEdit}
          >
            <span className="-ml-1 inline-flex min-w-0 max-w-full items-center gap-1 rounded px-1 py-0.5 transition-colors group-hover/label:bg-surface-gray-3">
              <span className={cn('min-w-0 truncate text-base', field.label ? 'text-ink-gray-8' : 'text-ink-gray-4')}>
                {field.label || field.fieldname}
              </span>
              {field.reqd && <span className="shrink-0 text-ink-red-5">*</span>}
              {locked && (
                <span
                  className="lucide-lock h-3 w-3 shrink-0 text-ink-gray-4"
                  title={__('Required by the record')}
                  aria-hidden="true"
                />
              )}
              <span
                className="lucide-pencil h-3 w-3 shrink-0 text-ink-gray-4 opacity-0 transition-opacity group-hover/label:opacity-100"
                aria-hidden="true"
              />
            </span>
          </div>
        )}
        {guestSelectMissing && (
          <Tooltip text={__("Guests can't see {0} records yet. Open to grant access.", [field.options ?? ''])}>
            <span className="lucide-triangle-alert h-3.5 w-3.5 shrink-0 text-ink-amber-6" aria-hidden="true" />
          </Tooltip>
        )}
        <Button variant="ghost" tooltip={expanded ? __('Collapse') : __('Edit field')} onClick={onToggle}>
          <span
            className={cn('lucide-chevron-down h-4 w-4 text-ink-gray-5 transition-transform', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        </Button>
        <Button variant="ghost" tooltip={__('Remove')} onClick={onRemove}>
          <span className="lucide-x h-4 w-4 text-ink-gray-5" aria-hidden="true" />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-outline-gray-2 px-2.5 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-base text-ink-gray-5">{__('Required')}</span>
            {locked ? (
              <Tooltip
                text={__(
                  "This field is required by the record and can't be made optional. Remove it to move it to hidden fields.",
                )}
              >
                <div className="inline-flex cursor-not-allowed">
                  <Switch value size="sm" />
                </div>
              </Tooltip>
            ) : (
              <Switch value={field.reqd} size="sm" onChange={(value) => onUpdate({ reqd: value })} />
            )}
          </div>
          <FormControl
            type="text"
            size="sm"
            label={__('Placeholder')}
            placeholder={__('Optional')}
            value={field.placeholder ?? ''}
            onChange={(value: string) => onUpdate({ placeholder: value })}
          />
          <FormControl
            type="text"
            size="sm"
            label={__('Description')}
            placeholder={__('Helper text under the field (optional)')}
            value={field.field_description ?? ''}
            onChange={(value: string) => onUpdate({ field_description: value })}
          />
          <div className="space-y-3 border-t border-outline-gray-2 pt-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base text-ink-gray-5">{__('Conditional logic')}</span>
              <Tooltip
                text={__(
                  "Frappe expression referencing other fields as doc.<fieldname>, e.g. eval:doc.country == 'India'. Leave blank for no condition.",
                )}
              >
                <span className="lucide-info h-3.5 w-3.5 text-ink-gray-4" aria-hidden="true" />
              </Tooltip>
            </div>
            <FormControl
              type="text"
              size="sm"
              label={__('Visible if')}
              placeholder={RULE_PLACEHOLDER}
              value={field.depends_on ?? ''}
              onChange={(value: string) => onUpdate({ depends_on: value })}
            />
            <FormControl
              type="text"
              size="sm"
              label={__('Mandatory if')}
              placeholder={RULE_PLACEHOLDER}
              value={field.mandatory_depends_on ?? ''}
              onChange={(value: string) => onUpdate({ mandatory_depends_on: value })}
            />
            <FormControl
              type="text"
              size="sm"
              label={__('Read-only if')}
              placeholder={RULE_PLACEHOLDER}
              value={field.read_only_depends_on ?? ''}
              onChange={(value: string) => onUpdate({ read_only_depends_on: value })}
            />
          </div>
          {guestSelectMissing && (
            <div className="flex items-start gap-2 rounded border border-outline-amber-2 bg-surface-amber-2 p-2.5">
              <span className="lucide-triangle-alert mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-amber-6" aria-hidden="true" />
              <div className="flex min-w-0 flex-col items-start gap-2">
                <p className="text-p-sm text-ink-gray-7">
                  {__("Guests can't see {0} records. Grant select access to list them publicly.", [
                    field.options ?? '',
                  ])}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  loading={granting}
                  label={__('Grant Access')}
                  onClick={onGrantGuest}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
