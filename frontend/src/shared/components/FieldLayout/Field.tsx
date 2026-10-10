import { useState } from 'react'
import { Icon } from '../Icon'
import { sanitizeHTML } from '../../utils/text'
import { getBoot, getSysDefaults } from '@/core/boot'
import { __ } from '@/core/i18n'
import {
  Button,
  Checkbox,
  Combobox,
  DatePicker,
  DateTimePicker,
  FormControl,
  TimePicker,
  Tooltip,
  type ComboboxOption,
} from '@/design-system'
import { useFieldLayout, type FieldLayoutContextValue } from '../../hooks/useFieldLayout'
import { useMeta } from '../../hooks/useMeta'
import { useUsers } from '../../hooks/useUsers'
import type { DocField } from '../../types/meta'
import { getButtonTheme, getButtonVariant } from '../../utils/buttonTheme'
import { getFormat } from '../../utils/date'
import { evaluateDependsOnValue } from '../../utils/expressions'
import { isFetchedFromLink } from '../../utils/fetchFrom'
import { applyStateFieldOptions, parseLinkFilters } from '../../utils/fieldTransforms'
import {
  getOptions,
  normalizeFieldValue,
  READ_ONLY_EXCLUDED_FIELD_TYPES,
  type FieldOption,
} from '../../utils/fieldOptions'
import { flt, formatCurrency, formatNumber } from '../../utils/numberFormat'
import { isNull, interpolateTemplate } from '../../utils/text'
import { createDocument } from '../../utils/documents'
import { validatePhone } from '../../utils/validation'
import { ArrowUpRightIcon, EditIcon, IndicatorIcon } from '../Icons'
import { UserAvatar } from '../UserAvatar'
import { AttachControl } from '../Controls/AttachControl'
import { ButtonControl } from '../Controls/ButtonControl'
import { CommitInput, CommitTextarea } from '../Controls/CommitInput'
import { CodeControl } from '../Controls/CodeControl'
import { ColorPickerControl } from '../Controls/ColorPickerControl'
import { DurationInput } from '../Controls/DurationInput'
import { FormattedInput } from '../Controls/FormattedInput'
import { GeolocationControl } from '../Controls/GeolocationControl'
import { Grid } from '../Controls/Grid'
import { HtmlControl } from '../Controls/HtmlControl'
import { Link } from '../Controls/Link'
import { RatingInput } from '../Controls/RatingInput'
import { IconControl, JsonControl, SignatureControl } from '../Controls/SpecialFieldControls'
import { TableMultiselectInput } from '../Controls/TableMultiselectInput'
import { TextEditorControl } from '../Controls/TextEditorControl'

type FieldObj = DocField & Record<string, any>

const DESCRIPTION_OUTSIDE = ['Link', 'Dynamic Link', 'Table MultiSelect', 'User']

function userDate(value: string): string {
  const datetime = (window as unknown as { frappe?: { datetime?: { str_to_user?: (input: string) => string } } }).frappe
    ?.datetime
  return datetime?.str_to_user ? datetime.str_to_user(value) : value
}

function DescriptionToggle({ html }: { html: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" aria-label="Description" className="text-ink-gray-5" onClick={() => setOpen(!open)}>
        <Icon icon="lucide-info" className="size-3.5" />
      </button>
      {open && (
        <p
          className="basis-full pl-[22px] text-[13px] leading-[1.6] text-ink-gray-5"
          dangerouslySetInnerHTML={{ __html: sanitizeHTML(html) }}
        />
      )}
    </>
  )
}

export interface FieldProps {
  field: DocField
  limitWidth?: boolean
}

function isExternalUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

function getPlaceholder(field: FieldObj): string {
  if (field.placeholder) return __(field.placeholder)
  if (['Select', 'Link'].includes(field.fieldtype)) return __('Select {0}', [__(field.label)])
  return __('Enter {0}', [__(field.label)])
}

function resolveOverrides(layout: FieldLayoutContextValue, fieldname: string): Record<string, any> | undefined {
  const { isGridRow, parentFieldname, data, fieldPropertyOverrides, formDocument } = layout
  if (isGridRow) {
    if (!parentFieldname) return undefined
    const colKey = `${parentFieldname}.${fieldname}`
    const rowName = data?.name
    const rowKey = rowName ? `${colKey}:${rowName}` : null
    const colOverrides = fieldPropertyOverrides[colKey]
    const rowOverrides = rowKey ? fieldPropertyOverrides[rowKey] : null
    if (!colOverrides && !rowOverrides) return undefined
    return { ...(colOverrides || {}), ...(rowOverrides || {}) }
  }
  return formDocument?.fieldPropertyOverrides?.[fieldname]
}

function isFieldVisible(candidate: FieldObj, hidden: unknown, preview: boolean, data: Record<string, any>): boolean {
  if (preview) return true
  if (hidden !== undefined) return !hidden
  const readOnlyField = Boolean(candidate.read_only || candidate.fieldtype === 'Read Only')
  const hideEmptyReadOnlyField =
    isNull(data[candidate.fieldname]) &&
    Number((getSysDefaults() as unknown as Record<string, unknown>).hide_empty_read_only_fields ?? 1)
  const showReadOnlyField = readOnlyField && !hideEmptyReadOnlyField
  return (
    (candidate.fieldtype === 'Check' || showReadOnlyField || !readOnlyField) &&
    (!candidate.depends_on || Boolean(candidate.display_via_depends_on)) &&
    !candidate.hidden
  )
}

export function Field({ field: baseField, limitWidth = false }: FieldProps) {
  const layout = useFieldLayout()
  const placeholderFor = (target: FieldObj) => (layout.standalone ? '' : getPlaceholder(target))
  const { data, doctype, preview, isGridRow, formDocument } = layout
  const { getUser, crmUsers } = useUsers()
  const meta = useMeta(doctype)
  const hasDoctype = Boolean(doctype)

  const overrides = resolveOverrides(layout, baseField.fieldname)

  function fieldChange(rawValue: unknown, df: FieldObj) {
    const value = normalizeFieldValue(rawValue)
    if (isGridRow) void layout.triggerOnChange(df.fieldname, value, data)
    else void layout.triggerOnChange(df.fieldname, value)
  }

  const field = ((): FieldObj => {
    let current: FieldObj = { ...baseField }
    if (overrides) Object.assign(current, overrides)

    current = applyStateFieldOptions(
      current,
      data,
      doctype,
      getBoot().state_options as Record<string, string[]>,
    ) as FieldObj

    if (current.fieldtype === 'Select' && typeof current.options === 'string') {
      const selectOptions: FieldOption[] = current.options
        .split('\n')
        .map((option: string) => ({ label: __(option), value: option }))
      if (selectOptions[0] && selectOptions[0].value !== '' && !current.reqd) {
        selectOptions.unshift({ label: '', value: '' })
      }
      current.options = selectOptions
    }

    if (current.fieldtype === 'Link' && current.options === 'User') {
      current.fieldtype = 'User'
      current.link_filters = JSON.stringify({
        name: ['in', crmUsers.map((user) => user.name)],
        ignore_user_type: 1,
        ...(parseLinkFilters(current.link_filters) || {}),
      })
    }

    if (current.fieldtype === 'Link' && current.options !== 'User' && !current.create) {
      const linkField = current
      current.create = (value: string, close: () => void) => {
        const callback = (created: { name?: string } | null) => {
          if (created?.name) fieldChange(created.name, linkField)
        }
        void createDocument(linkField.options, { name: value }, close, callback)
      }
    }

    const readOnlyViaDependsOn = evaluateDependsOnValue(current.read_only_depends_on, data)
    const scriptReadOnly = overrides?.read_only
    const effectiveReadOnly =
      scriptReadOnly !== undefined
        ? scriptReadOnly
        : current.read_only || (current.read_only_depends_on && readOnlyViaDependsOn)
    const scriptHidden = overrides?.hidden
    const displayViaDependsOn = evaluateDependsOnValue(current.depends_on, data)

    const resolved: FieldObj = {
      ...current,
      filters: parseLinkFilters(current.link_filters),
      placeholder: current.placeholder || current.label,
      display_via_depends_on: displayViaDependsOn,
      mandatory_via_depends_on: evaluateDependsOnValue(current.mandatory_depends_on, data),
      read_only: effectiveReadOnly,
      disabled: Boolean(effectiveReadOnly || isFetchedFromLink(current, data)),
    }

    resolved.visible = isFieldVisible(resolved, scriptHidden, preview, data)
    return resolved
  })()

  if (!field.visible) return null

  const value = data[field.fieldname]
  const disabled = Boolean(field.disabled)
  const linkQuery = layout.resolveLinkQuery?.(field.fieldname, isGridRow ? data : null)
  const linkFilters = linkQuery?.filters !== undefined ? linkQuery.filters : field.filters
  const linkSearchContext = {
    reference_doctype: doctype,
    link_fieldname: field.fieldname,
    ...(field.ignore_user_permissions ? { ignore_user_permissions: 1 } : {}),
  }

  const resolvedHtml = (() => {
    if (field.fieldtype !== 'HTML') return ''
    const injected = formDocument?.fieldHtmlMap?.[field.fieldname]
    if (injected !== undefined) return injected
    return interpolateTemplate(field.options || '', data)
  })()

  const formatted = hasDoctype
    ? {
        percent: meta.getFormattedPercent(field.fieldname, data),
        float: meta.getFormattedFloat(field.fieldname, data),
        currency: meta.getFormattedCurrency(field.fieldname, data, layout.parentDoc),
      }
    : {
        percent: `${formatNumber(data[field.fieldname], '', null)}%`,
        float: formatNumber(data[field.fieldname], '', null),
        currency: formatCurrency(data[field.fieldname], '', getSysDefaults().currency || 'USD', null),
      }

  const autocompleteOptions = (): ComboboxOption[] => {
    const options = getOptions(field.options)
    return [
      ...(options as ComboboxOption[]),
      {
        type: 'custom',
        key: '__custom_value',
        label: __('Use custom value'),
        slots: { label: ({ query }) => __('Use "{0}"', [query.trim()]) },
        condition: ({ query }) => {
          const trimmed = (query || '').trim()
          if (!trimmed) return false
          return !options.some((option) => {
            const isObject = option !== null && typeof option === 'object'
            const optionValue = isObject ? option.value : option
            const optionLabel = isObject ? option.label : option
            return String(optionValue ?? '') === trimmed || String(optionLabel ?? '') === trimmed
          })
        },
        onClick: ({ query }) => fieldChange(query.trim(), field),
      },
    ]
  }

  async function handleButtonClick() {
    if (typeof field.click === 'function') await field.click(data)
    else await layout.triggerButton(field.fieldname)
  }

  const showLabel = !['Check', 'Button', 'HTML'].includes(field.fieldtype)

  const control = (() => {
    if (
      (field.read_only || field.fieldtype === 'Read Only') &&
      !READ_ONLY_EXCLUDED_FIELD_TYPES.includes(field.fieldtype)
    ) {
      return (
        <FormControl
          type="text"
          value={
            field.fieldtype === 'Float' &&
            !Number(field.precision) &&
            value !== null &&
            value !== '' &&
            Number.isInteger(flt(value))
              ? String(flt(value))
              : field.fieldtype === 'Date' && value
                ? userDate(String(value))
                : (value ?? '')
          }
          placeholder={placeholderFor(field)}
          disabled
          description={field.description}
        />
      )
    }

    switch (true) {
      case field.fieldtype === 'Table':
        return (
          <Grid
            rows={value ?? []}
            onRowsChange={(rows) => layout.setFieldValue(field.fieldname, rows)}
            parent={data}
            doctype={field.options}
            parentDoctype={doctype}
            parentFieldname={field.fieldname}
          />
        )
      case field.fieldtype === 'Select':
        return (
          <FormControl
            type="select"
            className={`form-control ${field.prefix ? 'prefix' : ''}`}
            value={value ?? ''}
            options={field.options}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            description={field.description}
            onChange={(next: unknown) => fieldChange(next, field)}
            prefix={field.prefix ? () => <IndicatorIcon className={field.prefix} /> : undefined}
          />
        )
      case field.fieldtype === 'Check':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <Checkbox
                className="form-control"
                value={Boolean(value)}
                disabled={disabled}
                onChange={(checked) => fieldChange(checked, field)}
              />
              <label
                className={layout.standalone ? 'text-[13px] font-medium text-ink-gray-9' : 'text-sm text-ink-gray-7'}
                onClick={() => {
                  if (!disabled) fieldChange(!value, field)
                }}
              >
                {__(field.label)}
                {field.mandatory && <span className="text-ink-red-6">*</span>}
              </label>
              {field.description && field.show_description_on_click ? (
                <DescriptionToggle html={String(field.description)} />
              ) : null}
            </div>
            {field.description && !field.show_description_on_click ? (
              <p
                className={
                  layout.standalone
                    ? 'ml-[22px] text-[13px] leading-[1.6] text-ink-gray-5'
                    : 'ml-6 text-xs text-ink-gray-5'
                }
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(String(field.description)) }}
              />
            ) : null}
          </div>
        )
      case field.fieldtype === 'Link' || field.fieldtype === 'Dynamic Link':
        return (
          <div className="flex gap-1">
            <Link
              className="form-control flex-1 truncate"
              value={value}
              doctype={field.fieldtype === 'Link' ? field.options : data[field.options]}
              filters={linkFilters}
              query={linkQuery?.query}
              searchContext={linkSearchContext}
              placeholder={placeholderFor(field)}
              disabled={disabled}
              onCreate={field.create}
              onChange={(next) => fieldChange(next, field)}
            />
            {value && field.edit && (
              <Button className="shrink-0" label={__('Edit')} iconLeft={EditIcon} onClick={() => field.edit(value)} />
            )}
          </div>
        )
      case field.fieldtype === 'Table MultiSelect':
        return (
          <TableMultiselectInput
            doctype={field.options}
            values={value ?? []}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'User':
        return (
          <Link
            className="form-control w-full"
            value={value}
            valueLabel={value ? getUser(value).full_name : undefined}
            doctype={field.options}
            filters={field.filters}
            placeholder={placeholderFor(field)}
            hideMe
            onChange={(next) => fieldChange(next, field)}
            prefix={() => (value ? <UserAvatar className="mr-2" user={value} size="sm" /> : null)}
            itemPrefix={({ item }) => <UserAvatar className="mr-2" user={String(item.value)} size="sm" />}
            itemLabel={({ item }) => (
              <Tooltip text={String(item.value)}>
                <div className="cursor-pointer text-ink-gray-9">{getUser(String(item.value)).full_name}</div>
              </Tooltip>
            )}
          />
        )
      case field.fieldtype === 'Autocomplete':
        return (
          <Combobox
            value={value ?? null}
            options={autocompleteOptions()}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Time':
        return (
          <TimePicker
            value={value}
            format={getFormat('', '', false, true, false)}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Datetime':
        return (
          <DateTimePicker
            value={value}
            format={getFormat('', '', true, true, false)}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Date':
        return (
          <DatePicker
            value={value}
            format={getFormat('', '', true, false, false)}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            suffix={layout.standalone ? () => null : undefined}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Code':
        return (
          <CodeControl
            value={value}
            disabled={disabled}
            description={field.description}
            onCommit={(next) => fieldChange(next, field)}
          />
        )
      case ['Small Text', 'Text', 'Long Text'].includes(field.fieldtype):
        return (
          <CommitTextarea
            value={value}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            description={field.description}
            onCommit={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Markdown':
        return (
          <CommitTextarea
            value={value}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            description={field.description}
            onCommit={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'JSON':
        return (
          <JsonControl
            value={value}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            description={field.description}
            onCommit={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Password':
        return (
          <CommitInput
            kind="password"
            value={value}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            description={field.description}
            onCommit={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Int':
        return (
          <FormattedInput
            type="text"
            placeholder={placeholderFor(field)}
            value={value || '0'}
            disabled={disabled}
            description={field.description}
            onCommit={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Percent':
      case field.fieldtype === 'Float':
      case field.fieldtype === 'Currency': {
        const kind = field.fieldtype === 'Percent' ? 'percent' : field.fieldtype === 'Float' ? 'float' : 'currency'
        return (
          <FormattedInput
            type="text"
            value={
              kind === 'float' && flt(data[field.fieldname]) === 0
                ? String(flt(data[field.fieldname]))
                : formatted[kind]
            }
            placeholder={placeholderFor(field)}
            disabled={disabled}
            description={field.description}
            onCommit={(next) => fieldChange(flt(next), field)}
          />
        )
      }
      case field.fieldtype === 'Duration':
        return (
          <DurationInput
            value={value}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            description={field.description}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Rating':
        return (
          <RatingInput
            value={value}
            max={field.options || 5}
            disabled={disabled}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Button':
        return (
          <ButtonControl
            label={field.label ?? ''}
            icon={field.icon}
            theme={getButtonTheme(field.button_color)}
            variant={getButtonVariant(field.button_color)}
            disabled={disabled}
            onClick={() => void handleButtonClick()}
          />
        )
      case field.fieldtype === 'Attach' || field.fieldtype === 'Attach Image' || field.fieldtype === 'Image':
        return (
          <AttachControl
            value={value}
            doctype={doctype}
            docname={data.name}
            fieldname={field.fieldname}
            imageOnly={field.fieldtype === 'Attach Image' || field.fieldtype === 'Image'}
            disabled={disabled}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Signature':
        return <SignatureControl value={value} disabled={disabled} onChange={(next) => fieldChange(next, field)} />
      case field.fieldtype === 'Barcode':
        return (
          <CommitInput
            value={value}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            description={field.description}
            onCommit={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Color':
        return <ColorPickerControl value={value} disabled={disabled} onChange={(next) => fieldChange(next, field)} />
      case field.fieldtype === 'Icon':
        return (
          <IconControl
            value={value}
            disabled={disabled}
            placeholder={placeholderFor(field)}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'HTML':
        return (
          <HtmlControl
            html={resolvedHtml}
            hostRef={(element) => layout.registerHtmlHost?.(field.fieldname, element, isGridRow ? data : null)}
          />
        )
      case field.fieldtype === 'Text Editor':
        return (
          <TextEditorControl
            value={value}
            placeholder={placeholderFor(field)}
            disabled={disabled}
            onChange={(next) => fieldChange(next, field)}
          />
        )
      case field.fieldtype === 'Geolocation':
        return <GeolocationControl value={value} disabled={disabled} onChange={(next) => fieldChange(next, field)} />
      case field.fieldtype === 'Phone' || field.options === 'Phone':
        return (
          <CommitInput
            type="text"
            placeholder={placeholderFor(field)}
            value={value}
            disabled={disabled}
            description={field.description}
            error={Boolean(value) && !validatePhone(value) ? __('Enter a valid phone number') : undefined}
            onCommit={(next) => fieldChange(next, field)}
          />
        )
      default:
        return (
          <div className="flex items-center gap-1">
            <CommitInput
              className="flex-1"
              type="text"
              placeholder={placeholderFor(field)}
              value={value}
              disabled={disabled}
              description={field.description}
              onCommit={(next) => fieldChange(next, field)}
            />
            {isExternalUrl(value) && (
              <ArrowUpRightIcon
                className="h-4 w-4 shrink-0 cursor-pointer text-ink-gray-5 hover:text-ink-gray-8"
                onClick={(event) => {
                  event.stopPropagation()
                  window.open(value.trim(), '_blank', 'noopener,noreferrer')
                }}
              />
            )}
          </div>
        )
    }
  })()

  return (
    <div
      className={limitWidth ? 'field max-w-[50%] pr-[15px]' : 'field'}
      data-name={baseField.fieldname}
      data-bold={
        field.bold || field.reqd || (field.mandatory_depends_on && field.mandatory_via_depends_on) ? '1' : undefined
      }
    >
      {showLabel && (
        <div className={layout.standalone ? 'mb-2 text-base text-ink-gray-7' : 'mb-2 text-sm text-ink-gray-5'}>
          {__(field.label)}
          {(field.reqd || (field.mandatory_depends_on && field.mandatory_via_depends_on)) && (
            <span className="text-ink-red-5">{layout.standalone ? ' *' : '*'}</span>
          )}
        </div>
      )}
      {control}
      {field.description && DESCRIPTION_OUTSIDE.includes(field.fieldtype) ? (
        <p data-slot="description" dangerouslySetInnerHTML={{ __html: sanitizeHTML(String(field.description)) }} />
      ) : null}
    </div>
  )
}
