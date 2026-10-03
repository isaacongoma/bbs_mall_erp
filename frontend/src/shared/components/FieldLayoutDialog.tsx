import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { Button, Dialog, ErrorMessage } from '@/design-system'
import { useMeta } from '../hooks/useMeta'
import type { FieldLayoutDialogProps } from '../stores/fieldLayoutDialogStore'
import { findMissingMandatory } from '../utils/fieldTransforms'
import { FieldLayout, type LayoutTab } from './FieldLayout'

type AnyRecord = Record<string, any>

const GET_LAYOUT = 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout'

const NO_OVERRIDES: Record<string, never> = {}

function wrapFieldsInTab(fields: AnyRecord[]): LayoutTab[] {
  return [
    {
      name: '_tab',
      label: '',
      sections: [{ name: '_section', label: '', columns: [{ name: '_column', fields }] }],
    },
  ] as unknown as LayoutTab[]
}

function applyRequiredFlags(tabs: LayoutTab[], required: string[] | undefined): LayoutTab[] {
  if (!required || required.length === 0) return tabs
  const requiredSet = new Set(required)
  return (tabs as AnyRecord[]).map((tab) => ({
    ...tab,
    sections: (tab.sections || []).map((section: AnyRecord) => ({
      ...section,
      columns: (section.columns || []).map((column: AnyRecord) => ({
        ...column,
        fields: (column.fields || []).map((field: AnyRecord) =>
          requiredSet.has(field.fieldname) ? { ...field, reqd: 1 } : field,
        ),
      })),
    })),
  })) as unknown as LayoutTab[]
}

export function FieldLayoutDialog({
  title = 'Dialog',
  doctype = '',
  tabs,
  fields,
  fieldnames,
  defaults = {},
  required = [],
  size = 'xl',
  actions,
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  cancelLabel,
  onResolve,
}: FieldLayoutDialogProps) {
  const [show, setShow] = useState(true)
  const [error, setError] = useState('')
  const [resolved, setResolved] = useState(false)
  const [localDoc, setLocalDoc] = useState<AnyRecord>(() => ({ ...defaults }))
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({})
  const [fetchedTabs, setFetchedTabs] = useState<LayoutTab[] | null>(null)
  const [fetchFailed, setFetchFailed] = useState(false)
  const [requestedFor, setRequestedFor] = useState<string | null>(null)
  const { doctypeMeta, doctypesMeta } = useMeta(doctype)

  const isStatic = Boolean(tabs || fields)
  const useFieldnames = !isStatic && Boolean(doctype && fieldnames)
  const useLayout = !isStatic && !useFieldnames && Boolean(doctype)

  if (useLayout && requestedFor !== doctype) {
    setRequestedFor(doctype)
    rpc<LayoutTab[]>({ url: GET_LAYOUT, params: { doctype, type: 'Quick Entry' } })
      .then((data) => setFetchedTabs(data))
      .catch(() => {
        setFetchFailed(true)
        setError(__('Failed to load fields layout'))
      })
  }

  let baseTabs: LayoutTab[] | null = tabs ? (tabs as LayoutTab[]) : fields ? wrapFieldsInTab(fields) : null
  if (!baseTabs && useFieldnames && doctypeMeta) {
    const resolvedFields = (fieldnames ?? [])
      .map((name) => {
        const field = doctypeMeta.fields.find((item) => item.fieldname === name)
        return field ? { ...field } : null
      })
      .filter(Boolean) as AnyRecord[]
    baseTabs = wrapFieldsInTab(resolvedFields)
  }
  if (!baseTabs && useLayout) baseTabs = fetchedTabs
  const resolvedTabs = baseTabs ? applyRequiredFlags(baseTabs, required) : null
  const loading = !resolvedTabs && !fetchFailed && (useFieldnames || useLayout)

  function settle(result: Record<string, any> | null) {
    if (resolved) return
    setResolved(true)
    if (result === null) onCancel?.()
    onResolve(result)
  }

  function close(result: Record<string, any> | null) {
    setShow(false)
    settle(result)
  }

  function validate(): boolean {
    setError('')
    const allFields: AnyRecord[] = []
    for (const tab of (resolvedTabs ?? []) as AnyRecord[]) {
      for (const section of tab.sections || []) {
        for (const column of section.columns || []) {
          for (const field of column.fields || []) allFields.push(field)
        }
      }
    }
    const missing = findMissingMandatory(allFields as never, localDoc, {
      propertyOverrides: NO_OVERRIDES,
      doctypesMeta: doctype ? doctypesMeta : {},
    })
    if (missing.length > 0) {
      setError(__('Mandatory fields required: {0}', [missing.join(', ')]))
      return false
    }
    return true
  }

  function setBusy(index: number, value: boolean) {
    setLoadingMap((current) => ({ ...current, [index]: value }))
  }

  const buttons: Array<{
    label: string
    variant?: string
    theme?: string
    icon?: string
    loading: boolean
    onClick: () => Promise<void> | void
  }> = actions
    ? actions.map((action, index) => ({
        label: action.label || '',
        variant: action.variant,
        theme: action.theme,
        icon: action.icon,
        loading: Boolean(loadingMap[index]),
        onClick: async () => {
          if (action.onClick) {
            setBusy(index, true)
            try {
              await action.onClick({
                data: { ...localDoc },
                close: (result?: Record<string, any>) => close(result !== undefined ? result : { ...localDoc }),
                validate,
              })
            } finally {
              setBusy(index, false)
            }
          } else {
            if (!validate()) return
            close({ ...localDoc })
          }
        },
      }))
    : [
        {
          label: submitLabel,
          variant: 'solid',
          loading: Boolean(loadingMap[0]),
          onClick: async () => {
            if (!validate()) return
            const data = { ...localDoc }
            if (onSubmit) {
              setBusy(0, true)
              try {
                await onSubmit(data)
              } catch (failure) {
                setError((failure as Error).message || __('An error occurred'))
                return
              } finally {
                setBusy(0, false)
              }
            }
            close(data)
          },
        },
        ...(cancelLabel ? [{ label: cancelLabel, loading: false, onClick: () => close(null) }] : []),
      ]

  function handleFieldChange(fieldname: string, value: unknown, row?: AnyRecord | null) {
    if (row) {
      row[fieldname] = value
      setLocalDoc((current) => ({ ...current }))
      return
    }
    setLocalDoc((current) => ({ ...current, [fieldname]: value }))
  }

  return (
    <Dialog
      open={show}
      onOpenChange={(open) => {
        if (!open) close(null)
      }}
      size={size as never}
      bare
    >
      <div className="bg-surface-elevation-2 px-4 pb-6 pt-5 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-3xl-semibold leading-6 text-ink-gray-9">{__(title)}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="w-7" icon="lucide-x" onClick={() => close(null)} />
          </div>
        </div>
        {resolvedTabs ? (
          <div>
            <FieldLayout
              tabs={resolvedTabs}
              data={localDoc}
              doctype={doctype || ''}
              context={{ fieldPropertyOverrides: NO_OVERRIDES, onFieldChange: handleFieldChange }}
            />
            <ErrorMessage className="mt-2" message={error} />
          </div>
        ) : loading ? (
          <div className="py-8 text-center text-ink-gray-5">{__('Loading...')}</div>
        ) : (
          <ErrorMessage className="mt-2" message={error} />
        )}
      </div>
      <div className="px-4 pb-7 pt-4 sm:px-6">
        <div className="space-y-2">
          {buttons.map((button, index) => (
            <Button
              key={button.label + index}
              className="w-full"
              label={__(button.label)}
              variant={button.variant as never}
              theme={button.theme as never}
              icon={button.icon as never}
              loading={button.loading}
              onClick={() => void button.onClick()}
            />
          ))}
        </div>
      </div>
    </Dialog>
  )
}
