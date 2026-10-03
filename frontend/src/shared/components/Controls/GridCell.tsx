import { Checkbox, Combobox, DatePicker, DateTimePicker, FormControl, TimePicker, Tooltip } from '@/design-system'
import { useMeta } from '../../hooks/useMeta'
import { useUsers } from '../../hooks/useUsers'
import type { DocField, DocRecord } from '../../types/meta'
import { getButtonTheme, getButtonVariant } from '../../utils/buttonTheme'
import { getFormat } from '../../utils/date'
import { getOptions, READ_ONLY_EXCLUDED_FIELD_TYPES } from '../../utils/fieldOptions'
import { flt } from '../../utils/numberFormat'
import { interpolateTemplate } from '../../utils/text'
import { UserAvatar } from '../UserAvatar'
import { AttachControl } from './AttachControl'
import { ButtonControl } from './ButtonControl'
import { CommitInput, CommitTextarea } from './CommitInput'
import { DurationInput } from './DurationInput'
import { FormattedInput } from './FormattedInput'
import { GeolocationControl } from './GeolocationControl'
import { HtmlControl } from './HtmlControl'
import { Link } from './Link'
import { RatingInput } from './RatingInput'
import { TextEditorControl } from './TextEditorControl'

type FieldObj = DocField & Record<string, any>

export interface GridCellProps {
  field: FieldObj
  row: DocRecord
  doctype: string
  parentDoc: DocRecord | null
  editable: boolean
  onChange: (value: unknown, field: FieldObj, row: DocRecord) => void
  onButtonClick: (field: FieldObj, row: DocRecord) => void
}

export function GridCell({ field, row, doctype, parentDoc, editable, onChange, onButtonClick }: GridCellProps) {
  const { getUser } = useUsers()
  const meta = useMeta(doctype)
  const value = row[field.fieldname]
  const disabled = Boolean(field.disabled)

  if (field.read_only && !READ_ONLY_EXCLUDED_FIELD_TYPES.includes(field.fieldtype)) {
    return <FormControl type="text" value={value ?? ''} placeholder={field.placeholder} disabled />
  }

  switch (true) {
    case field.fieldtype === 'Link' || field.fieldtype === 'Dynamic Link':
      return (
        <Link
          className="text-sm text-ink-gray-8"
          value={value}
          doctype={field.fieldtype === 'Link' ? field.options : row[field.options]}
          filters={field.filters}
          disabled={disabled}
          onCreate={(query, close) => field.create?.(query, field, row, close)}
          onChange={(next) => onChange(next, field, row)}
        />
      )
    case field.fieldtype === 'User':
      return (
        <Link
          className="form-control"
          value={value}
          valueLabel={value ? getUser(value).full_name : undefined}
          doctype={field.options}
          filters={field.filters}
          placeholder={field.placeholder}
          disabled={disabled}
          hideMe
          onChange={(next) => onChange(next, field, row)}
          prefix={() => <UserAvatar className="mr-2" user={value} size="sm" />}
          itemPrefix={({ item }) => <UserAvatar className="mr-2" user={String(item.value)} size="sm" />}
          itemLabel={({ item }) => (
            <Tooltip text={String(item.value)}>
              <div className="cursor-pointer text-ink-gray-9">{getUser(String(item.value)).full_name}</div>
            </Tooltip>
          )}
        />
      )
    case field.fieldtype === 'Check':
      return (
        <div className="flex h-full items-center justify-center bg-surface-base">
          <Checkbox
            className="cursor-pointer duration-300"
            value={Boolean(value)}
            disabled={!editable || disabled}
            onChange={(checked) => onChange(checked, field, row)}
          />
        </div>
      )
    case field.fieldtype === 'Time':
      return (
        <TimePicker
          value={value}
          variant="outline"
          format={getFormat('', '', false, true, false)}
          onChange={(next) => onChange(next, field, row)}
        />
      )
    case field.fieldtype === 'Date':
      return (
        <DatePicker
          value={value}
          variant="outline"
          format={getFormat('', '', true, false, false)}
          onChange={(next) => onChange(next, field, row)}
        />
      )
    case field.fieldtype === 'Datetime':
      return (
        <DateTimePicker
          value={value}
          variant="outline"
          format={getFormat('', '', true, true, false)}
          onChange={(next) => onChange(next, field, row)}
        />
      )
    case ['Small Text', 'Text', 'Long Text', 'Code'].includes(field.fieldtype):
      return <CommitTextarea rows={1} variant="outline" value={value} onCommit={(next) => onChange(next, field, row)} />
    case field.fieldtype === 'Select':
      return (
        <FormControl
          type="select"
          className="text-sm text-ink-gray-8"
          variant="outline"
          value={value ?? ''}
          options={field.options}
          disabled={disabled}
          onChange={(next: unknown) => onChange(next, field, row)}
        />
      )
    case field.fieldtype === 'Password':
      return (
        <CommitInput
          kind="password"
          variant="outline"
          value={value}
          disabled={disabled}
          onCommit={(next) => onChange(next, field, row)}
        />
      )
    case field.fieldtype === 'Int':
      return (
        <FormattedInput
          className="[&_input]:text-right"
          type="text"
          variant="outline"
          value={value || '0'}
          disabled={disabled}
          onCommit={(next) => onChange(next, field, row)}
        />
      )
    case field.fieldtype === 'Percent':
      return (
        <FormattedInput
          className="[&_input]:text-right"
          type="text"
          variant="outline"
          value={meta.getFloatWithPrecision(field.fieldname, row)}
          formattedValue={`${value || '0'}%`}
          disabled={disabled}
          onCommit={(next) => onChange(flt(next), field, row)}
        />
      )
    case field.fieldtype === 'Float':
      return (
        <FormattedInput
          className="[&_input]:text-right"
          type="text"
          variant="outline"
          value={meta.getFloatWithPrecision(field.fieldname, row)}
          formattedValue={value}
          disabled={disabled}
          onCommit={(next) => onChange(flt(next), field, row)}
        />
      )
    case field.fieldtype === 'Currency':
      return (
        <FormattedInput
          className="[&_input]:text-right"
          type="text"
          variant="outline"
          value={meta.getCurrencyWithPrecision(field.fieldname, row)}
          formattedValue={meta.getFormattedCurrency(field.fieldname, row, parentDoc)}
          disabled={disabled}
          onCommit={(next) => onChange(flt(next), field, row)}
        />
      )
    case field.fieldtype === 'Duration':
      return (
        <DurationInput
          value={value}
          variant="outline"
          disabled={disabled}
          onChange={(next) => onChange(next, field, row)}
        />
      )
    case field.fieldtype === 'Rating':
      return (
        <div className="flex h-full w-full items-center overflow-hidden [&_::-webkit-scrollbar]:h-0">
          <RatingInput
            className="flex-nowrap overflow-x-auto px-2"
            value={value}
            disabled={disabled}
            max={field.options || 5}
            onChange={(next) => onChange(next, field, row)}
          />
        </div>
      )
    case field.fieldtype === 'Button':
      return (
        <div className="flex h-full items-center px-1">
          <ButtonControl
            className="button-control"
            label={field.label ?? ''}
            icon={field.icon}
            theme={getButtonTheme(field.button_color)}
            variant={getButtonVariant(field.button_color)}
            disabled={disabled}
            onClick={() => onButtonClick(field, row)}
          />
        </div>
      )
    case field.fieldtype === 'Attach' || field.fieldtype === 'Attach Image':
      return (
        <div className="flex h-full w-full items-center">
          <AttachControl
            variant="ghost"
            className="w-full"
            value={value}
            doctype={doctype}
            docname={row.name}
            fieldname={field.fieldname}
            imageOnly={field.fieldtype === 'Attach Image'}
            disabled={disabled}
            onChange={(next) => onChange(next, field, row)}
          />
        </div>
      )
    case field.fieldtype === 'HTML':
      return (
        <div className="overflow-hidden px-2 py-1">
          <HtmlControl html={interpolateTemplate(field.options || '', row)} />
        </div>
      )
    case field.fieldtype === 'Geolocation':
      return (
        <div className="flex h-full w-full items-center">
          <GeolocationControl
            variant="ghost"
            className="w-full"
            value={value}
            disabled={disabled}
            onChange={(next) => onChange(next, field, row)}
          />
        </div>
      )
    case field.fieldtype === 'Text Editor':
      return (
        <div className="flex h-full w-full items-center">
          <TextEditorControl
            variant="ghost"
            size="sm"
            fixedMenu={false}
            bubbleMenu
            editorClass="w-full !min-h-[38px] !h-[38px]"
            value={value}
            placeholder={field.placeholder}
            disabled={disabled}
            onChange={(next) => onChange(next, field, row)}
          />
        </div>
      )
    case field.fieldtype === 'Autocomplete':
      return (
        <Combobox
          className="combobox"
          variant="outline"
          value={value ?? null}
          options={getOptions(field.options) as never}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(next) => onChange(next, field, row)}
        />
      )
    default:
      return (
        <CommitInput
          className="text-sm text-ink-gray-8"
          type="text"
          variant="outline"
          value={value}
          onCommit={(next) => onChange(next, field, row)}
        />
      )
  }
}
