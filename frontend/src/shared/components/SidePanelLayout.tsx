import { useState, type ReactNode } from 'react'
import { getSysDefaults } from '@/core/boot'
import { __ } from '@/core/i18n'
import { Button, Checkbox, DatePicker, DateTimePicker, Select, TimePicker, Tooltip, cn } from '@/design-system'
import { useDocument } from '../hooks/useDocument'
import { useIsMobileView } from '../hooks/useIsMobileView'
import { useMeta } from '../hooks/useMeta'
import { useUsers } from '../hooks/useUsers'
import type { DocField, DocRecord } from '../types/meta'
import { getButtonTheme, getButtonVariant } from '../utils/buttonTheme'
import { getFormat } from '../utils/date'
import { createDocument } from '../utils/documents'
import { evaluateDependsOnValue } from '../utils/expressions'
import { parseLinkFilters } from '../utils/fieldTransforms'
import { flt } from '../utils/numberFormat'
import { interpolateTemplate, isNull } from '../utils/text'
import '../styles/sidePanel.css'
import { AttachControl } from './Controls/AttachControl'
import { ButtonControl } from './Controls/ButtonControl'
import { CommitInput, CommitTextarea } from './Controls/CommitInput'
import { DurationInput } from './Controls/DurationInput'
import { FormattedInput } from './Controls/FormattedInput'
import { GeolocationControl } from './Controls/GeolocationControl'
import { HtmlControl } from './Controls/HtmlControl'
import { Link } from './Controls/Link'
import { RatingInput } from './Controls/RatingInput'
import { TextEditorControl } from './Controls/TextEditorControl'
import { CollapsibleSection } from './CollapsibleSection'
import { FadedScrollableDiv } from './FadedScrollableDiv'
import { ArrowUpRightIcon, EditIcon } from './Icons'
import { PrimaryDropdown } from './PrimaryDropdown'
import { SidePanelModal } from './SidePanelModal'
import { UserAvatar } from './UserAvatar'

type AnyRecord = Record<string, any>
type FieldObj = DocField & AnyRecord

export interface SidePanelSection {
  name: string
  label?: string
  opened?: boolean
  editable?: boolean
  columns?: Array<{ name?: string; fields: DocField[] }>
  [key: string]: any
}

interface ParsedSection extends SidePanelSection {
  visible: boolean
  showEditButton: boolean
  parsedFields: FieldObj[]
}

export interface SidePanelLayoutProps {
  sections?: SidePanelSection[]
  doctype?: string
  docname: string
  preview?: boolean
  addContact?: (() => void) | null
  renderSection?: (props: { section: ParsedSection }) => ReactNode
  renderActions?: (props: { section: ParsedSection }) => ReactNode
  onBeforeFieldChange?: (change: AnyRecord) => void
  onAfterFieldChange?: (change: AnyRecord) => void
  onReload?: () => void
}

interface BodyDocument {
  doc: DocRecord
  fieldPropertyOverrides?: Record<string, AnyRecord>
  fieldHtmlMap?: Record<string, string>
  save?: { submit: (params: unknown, overrides?: AnyRecord) => unknown }
}

interface BodyProps extends SidePanelLayoutProps {
  document: BodyDocument
  triggerOnChange: (fieldname: string, value: unknown) => Promise<void> | void
  triggerButton: (fieldname: string) => Promise<void> | void
}

const READ_ONLY_TEXT_EXCLUDED = [
  'Int',
  'Float',
  'Currency',
  'Percent',
  'Check',
  'Dropdown',
  'Duration',
  'Rating',
  'Button',
  'Attach',
  'Attach Image',
  'HTML',
  'Geolocation',
  'Text Editor',
]

const TEXTAREA_FIELDTYPES = ['Small Text', 'Text', 'Long Text', 'Code']

function isExternalUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

function ratingMax(field: FieldObj): number {
  return Number(field.options) || 5
}

function SidePanelBody({
  sections = [],
  doctype = 'CRM Lead',
  preview = false,
  renderSection,
  renderActions,
  onBeforeFieldChange,
  onAfterFieldChange,
  onReload,
  document,
  triggerOnChange,
  triggerButton,
}: BodyProps) {
  const meta = useMeta(doctype)
  const { crmUsers, isManager, getUser } = useUsers()
  const isMobileView = useIsMobileView()
  const [showSidePanelModal, setShowSidePanelModal] = useState(false)
  const doc = document.doc || {}

  async function fieldChange(value: unknown, field: FieldObj) {
    if (preview) return
    await triggerOnChange(field.fieldname, value)
    if (onBeforeFieldChange) {
      onBeforeFieldChange({ [field.fieldname]: value })
    } else {
      document.save?.submit(null, { onSuccess: () => onAfterFieldChange?.({ [field.fieldname]: value }) })
    }
  }

  function isFieldVisible(field: FieldObj, scriptHidden: unknown): boolean {
    if (preview) return true
    if (scriptHidden !== undefined) return !scriptHidden
    const readOnlyField = Boolean(field.read_only || field.fieldtype === 'Read Only')
    const hideEmptyReadOnlyField =
      isNull(doc[field.fieldname]) &&
      Number((getSysDefaults() as unknown as Record<string, unknown>).hide_empty_read_only_fields ?? 1)
    const showReadOnlyField = readOnlyField && !hideEmptyReadOnlyField
    return (
      (field.fieldtype === 'Check' || field.fieldtype === 'Button' || showReadOnlyField || !readOnlyField) &&
      (!field.depends_on || Boolean(field.display_via_depends_on)) &&
      !field.hidden
    )
  }

  function parsedField(source: DocField): FieldObj {
    const field: FieldObj = { ...source }
    const overrides = document.fieldPropertyOverrides?.[field.fieldname]
    if (overrides) Object.assign(field, overrides)

    if (field.fieldtype === 'Select' && typeof field.options === 'string') {
      const options = field.options.split('\n').map((option: string) => ({ label: option, value: option }))
      if (options[0] && options[0].value !== '' && !field.reqd) options.unshift({ label: '', value: '' })
      field.options = options
    }

    if (field.fieldtype === 'Link' && field.options === 'User') {
      field.fieldtype = 'User'
      field.link_filters = JSON.stringify({
        name: ['in', crmUsers.map((user) => user.name)],
        ignore_user_type: 1,
        ...(parseLinkFilters(field.link_filters) || {}),
      })
    }

    if (field.fieldtype === 'Link' && field.options !== 'User' && !field.create) {
      const linkField = field
      field.create = (value: string, close: () => void) => {
        const callback = (created: { name?: string } | null) => {
          if (created?.name) void fieldChange(created.name, linkField)
        }
        void createDocument(linkField.options, { name: value }, close, callback)
      }
    }

    const readOnlyViaDependsOn = evaluateDependsOnValue(field.read_only_depends_on, doc)
    const scriptReadOnly = overrides?.read_only
    const effectiveReadOnly =
      scriptReadOnly !== undefined
        ? scriptReadOnly
        : field.read_only || (field.read_only_depends_on && readOnlyViaDependsOn)

    const resolved: FieldObj = {
      ...field,
      filters: parseLinkFilters(field.link_filters),
      placeholder: field.placeholder || field.label,
      display_via_depends_on: evaluateDependsOnValue(field.depends_on, doc),
      mandatory_via_depends_on: evaluateDependsOnValue(field.mandatory_depends_on, doc),
      read_only: effectiveReadOnly,
    }
    resolved.visible = isFieldVisible(resolved, overrides?.hidden)
    return resolved
  }

  const editButtonIndex = sections.findIndex((candidate) => candidate.name !== 'contacts_section')
  const parsedSections: ParsedSection[] = sections.map((source, sectionIndex) => {
    const overrides = document.fieldPropertyOverrides?.[source.name]
    const section: SidePanelSection = overrides ? { ...source, ...overrides } : { ...source }
    const parsedFields = (section.columns?.[0]?.fields ?? []).map((field) => parsedField(field))
    const isContactSection = section.name === 'contacts_section'
    const showEditButton = !(isMobileView || !isManager() || isContactSection) && sectionIndex === editButtonIndex
    const visible =
      overrides?.hidden !== undefined
        ? !overrides.hidden
        : Boolean(isContactSection || parsedFields.filter((field) => field.visible).length)
    return { ...section, parsedFields, visible, showEditButton }
  })

  const firstVisibleIndex = parsedSections.findIndex((section) => section.visible)

  async function handleButtonClick(field: FieldObj) {
    if (preview) return
    if (typeof field.click === 'function') await field.click(doc)
    else await triggerButton(field.fieldname)
  }

  function renderControl(field: FieldObj): ReactNode {
    const value = doc[field.fieldname]
    const readOnly = Boolean(field.read_only)

    if (field.read_only && !READ_ONLY_TEXT_EXCLUDED.includes(field.fieldtype)) {
      return (
        <div className="flex h-7 cursor-pointer items-center px-2 py-1 text-ink-gray-5">
          <Tooltip text={__(field.tooltip)}>
            <div>{value}</div>
          </Tooltip>
        </div>
      )
    }

    switch (field.fieldtype) {
      case 'Dropdown':
        return (
          <PrimaryDropdown
            value={value}
            placeholder={field.placeholder}
            itemPlaceholder={field.itemPlaceholder}
            options={field.options}
            validate={field.validate}
            onCreate={field.onCreate}
            label={field.label}
          />
        )
      case 'Check':
        return (
          <Checkbox
            className="checkbox-control"
            value={Boolean(value)}
            disabled={readOnly}
            onChange={(checked) => {
              const next = checked ? 1 : 0
              if (next === (value ? 1 : 0)) return
              void fieldChange(next, field)
            }}
          />
        )
      case 'Small Text':
      case 'Text':
      case 'Long Text':
      case 'Code':
        return (
          <CommitTextarea
            className="form-control"
            variant="ghost"
            value={value}
            placeholder={field.placeholder}
            onCommit={(next) => void fieldChange(next, field)}
          />
        )
      case 'Select':
        return (
          <Select
            className="form-control select-control cursor-pointer truncate"
            variant="ghost"
            value={value ?? ''}
            options={field.options}
            placeholder={field.placeholder}
            onChange={(next) => void fieldChange(next, field)}
          />
        )
      case 'User':
        return (
          <Link
            className="form-control"
            value={value}
            valueLabel={value ? getUser(value).full_name : undefined}
            doctype="User"
            filters={field.filters}
            placeholder={`${__('Select')} ${field.label}...`}
            hideMe
            onChange={(next) => void fieldChange(next, field)}
            prefix={() => (value ? <UserAvatar className="mr-1.5" user={value} size="sm" /> : null)}
            itemPrefix={({ item }) => <UserAvatar className="mr-1.5" user={String(item.value)} size="sm" />}
            itemLabel={({ item }) => (
              <Tooltip text={String(item.value)}>
                <div className="cursor-pointer text-ink-gray-9">{getUser(String(item.value)).full_name}</div>
              </Tooltip>
            )}
          />
        )
      case 'Link':
      case 'Dynamic Link':
        return (
          <Link
            className="form-control select-text"
            value={value}
            doctype={field.fieldtype === 'Link' ? field.options : doc[field.options]}
            filters={field.filters}
            placeholder={field.placeholder}
            onCreate={field.create}
            onChange={(next) => void fieldChange(next, field)}
          />
        )
      case 'Time':
        return (
          <div className="form-control">
            <TimePicker
              value={value}
              format={getFormat('', '', false, true, false)}
              placeholder={field.placeholder}
              onChange={(next) => void fieldChange(next, field)}
            />
          </div>
        )
      case 'Datetime':
        return (
          <div className="form-control">
            <DateTimePicker
              value={value}
              format={getFormat('', '', true, true, false)}
              placeholder={field.placeholder}
              side="left"
              align="start"
              onChange={(next) => void fieldChange(next, field)}
            />
          </div>
        )
      case 'Date':
        return (
          <div className="form-control">
            <DatePicker
              value={value}
              format={getFormat('', '', true, false, false)}
              placeholder={field.placeholder}
              side="left"
              align="start"
              onChange={(next) => void fieldChange(next, field)}
            />
          </div>
        )
      case 'Percent':
        return (
          <FormattedInput
            className="form-control"
            type="text"
            variant="ghost"
            value={meta.getFormattedPercent(field.fieldname, doc)}
            placeholder={field.placeholder}
            disabled={readOnly}
            onCommit={(next) => void fieldChange(flt(next), field)}
          />
        )
      case 'Password':
        return (
          <CommitInput
            kind="password"
            className="form-control"
            variant="ghost"
            value={value}
            placeholder={field.placeholder}
            disabled={readOnly}
            onCommit={(next) => void fieldChange(next, field)}
          />
        )
      case 'Int':
        return (
          <FormattedInput
            className="form-control"
            type="text"
            variant="ghost"
            value={value || '0'}
            placeholder={field.placeholder}
            disabled={readOnly}
            onCommit={(next) => void fieldChange(next, field)}
          />
        )
      case 'Float':
        return (
          <FormattedInput
            className="form-control"
            type="text"
            variant="ghost"
            value={meta.getFormattedFloat(field.fieldname, doc)}
            placeholder={field.placeholder}
            disabled={readOnly}
            onCommit={(next) => void fieldChange(flt(next), field)}
          />
        )
      case 'Currency':
        return (
          <FormattedInput
            className="form-control"
            type="text"
            variant="ghost"
            value={meta.getFormattedCurrency(field.fieldname, doc)}
            placeholder={field.placeholder}
            disabled={readOnly}
            onCommit={(next) => void fieldChange(flt(next), field)}
          />
        )
      case 'Duration':
        return (
          <DurationInput
            variant="ghost"
            value={value}
            placeholder={field.placeholder}
            disabled={readOnly}
            onChange={(next) => void fieldChange(next, field)}
          />
        )
      case 'Rating':
        return (
          <RatingInput
            className="pl-[10px]"
            value={value || 0}
            max={ratingMax(field)}
            disabled={readOnly}
            onChange={(next) => void fieldChange(next, field)}
          />
        )
      case 'Button':
        return (
          <ButtonControl
            label={field.label ?? ''}
            icon={field.icon}
            theme={getButtonTheme(field.button_color)}
            variant={getButtonVariant(field.button_color)}
            disabled={readOnly}
            onClick={() => void handleButtonClick(field)}
          />
        )
      case 'Attach':
      case 'Attach Image':
        return (
          <AttachControl
            className="attach-control"
            value={value}
            doctype={doctype}
            docname={doc.name}
            fieldname={field.fieldname}
            imageOnly={field.fieldtype === 'Attach Image'}
            disabled={readOnly}
            onChange={(next) => void fieldChange(next, field)}
          />
        )
      case 'HTML': {
        const injected = document.fieldHtmlMap?.[field.fieldname]
        return <HtmlControl html={injected !== undefined ? injected : interpolateTemplate(field.options || '', doc)} />
      }
      case 'Geolocation':
        return (
          <GeolocationControl
            className="geolocation-control"
            value={value}
            disabled={readOnly}
            onChange={(next) => void fieldChange(next, field)}
          />
        )
      case 'Text Editor':
        return (
          <TextEditorControl
            variant="ghost"
            fixedMenu={false}
            bubbleMenu
            editorClass="w-full !min-h-[38px] !h-[38px] ml-1"
            value={value}
            placeholder={field.placeholder}
            disabled={readOnly}
            onChange={(next) => void fieldChange(next, field)}
          />
        )
      default:
        return (
          <CommitInput
            className="form-control"
            type="text"
            variant="ghost"
            value={value}
            placeholder={field.placeholder}
            onCommit={(next) => void fieldChange(next, field)}
          />
        )
    }
  }

  return (
    <>
      <div className="sections side-panel flex flex-col overflow-y-auto">
        {parsedSections.map((section, index) =>
          !section.visible ? null : (
            <div key={section.name} className="section flex flex-col">
              {index !== firstVisibleIndex && <div className="section-border h-px w-full border-t" />}
              <div className="p-1 sm:p-3">
                <CollapsibleSection
                  labelClass="px-2 font-semibold"
                  headerClass="h-8"
                  label={section.label}
                  hideLabel={!section.label}
                  opened={section.opened}
                  actions={
                    preview
                      ? undefined
                      : (renderActions?.({ section }) ??
                        (section.showEditButton ? (
                          <Button
                            tooltip={__('Edit Fields Layout')}
                            variant="ghost"
                            className="mr-2 w-7"
                            icon={EditIcon}
                            onClick={() => setShowSidePanelModal(true)}
                          />
                        ) : undefined))
                  }
                >
                  {renderSection ? (
                    renderSection({ section })
                  ) : section.parsedFields.length ? (
                    <FadedScrollableDiv
                      className="column flex flex-col gap-1.5 overflow-y-auto"
                      style={{ maxHeight: index === parsedSections.length - 1 ? 'none' : '300px' }}
                    >
                      {section.parsedFields.map((field, fieldIndex) => {
                        if (!field.visible) return null
                        const isTextarea = TEXTAREA_FIELDTYPES.includes(field.fieldtype)
                        const wide = ['Button', 'HTML'].includes(field.fieldtype)
                        const value = doc[field.fieldname]
                        return (
                          <div
                            key={field.fieldname}
                            className={cn(
                              'field flex gap-2 px-3 leading-5',
                              fieldIndex === 0 && 'mt-3',
                              isTextarea ? 'items-start' : 'items-center',
                            )}
                          >
                            {!wide && (
                              <Tooltip text={__(field.label)} hoverDelay={1}>
                                <div
                                  className={cn(
                                    'flex w-[35%] min-w-20 shrink-0 items-center gap-0.5',
                                    isTextarea && 'pt-[9px]',
                                  )}
                                >
                                  <div className="truncate text-sm text-ink-gray-5">{__(field.label)}</div>
                                  {(field.reqd || (field.mandatory_depends_on && field.mandatory_via_depends_on)) && (
                                    <div className="text-ink-red-5">*</div>
                                  )}
                                </div>
                              </Tooltip>
                            )}
                            <div className={cn('flex items-center justify-between', wide ? 'w-full' : 'w-[65%]')}>
                              <div className="grid min-h-[28px] flex-1 items-center overflow-hidden text-base">
                                {renderControl(field)}
                              </div>
                              <div className="ml-1">
                                {field.fieldtype === 'Link' && field.link && value ? (
                                  <ArrowUpRightIcon
                                    className="h-4 w-4 shrink-0 cursor-pointer text-ink-gray-5 hover:text-ink-gray-8"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      field.link(value)
                                    }}
                                  />
                                ) : isExternalUrl(value) ? (
                                  <ArrowUpRightIcon
                                    className="h-4 w-4 shrink-0 cursor-pointer text-ink-gray-5 hover:text-ink-gray-8"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      window.open(value.trim(), '_blank', 'noopener,noreferrer')
                                    }}
                                  />
                                ) : null}
                                {field.fieldtype === 'Link' && field.edit && value && (
                                  <EditIcon
                                    className="size-3.5 shrink-0 cursor-pointer text-ink-gray-5 hover:text-ink-gray-8"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      field.edit(value)
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </FadedScrollableDiv>
                  ) : null}
                </CollapsibleSection>
              </div>
            </div>
          ),
        )}
      </div>
      {showSidePanelModal && (
        <SidePanelModal
          open={showSidePanelModal}
          onOpenChange={setShowSidePanelModal}
          doctype={doctype}
          onReload={onReload}
        />
      )}
    </>
  )
}

function SidePanelWithDocument(props: SidePanelLayoutProps) {
  const bundle = useDocument(props.doctype ?? 'CRM Lead', props.docname)
  return (
    <SidePanelBody
      {...props}
      document={bundle.document as unknown as BodyDocument}
      triggerOnChange={bundle.triggerOnChange}
      triggerButton={bundle.triggerButton}
    />
  )
}

const NO_DOCUMENT: BodyDocument = { doc: {} }
const noop = () => undefined

export function SidePanelLayout(props: SidePanelLayoutProps) {
  if (props.docname) return <SidePanelWithDocument {...props} />
  return <SidePanelBody {...props} document={NO_DOCUMENT} triggerOnChange={noop} triggerButton={noop} />
}
