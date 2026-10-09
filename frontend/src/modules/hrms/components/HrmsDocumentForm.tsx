import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { rpc } from '@/core/api/rpc'
import { ApiError, toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { Button, ErrorMessage, Spinner } from '@/design-system'
import { FieldLayout, type LayoutSection, type LayoutTab } from '@/shared/components/FieldLayout'
import { findMissingMandatory } from '@/shared/utils/fieldTransforms'
import type { DocField, DocRecord } from '@/shared/types/meta'
import { useDocument } from '@/shared/hooks/useDocument'
import { useMeta } from '@/shared/hooks/useMeta'
import type { HrmsEmployee } from '../types'
import { HrmsAttachments } from './HrmsAttachments'

interface HrmsDocumentFormProps {
  doctype: string
  title: string
  description: string
  listPath: string
  employee: HrmsEmployee | null
  docname?: string
  excludedFields?: string[]
  seed?: Record<string, unknown>
  renderExtras?: (context: {
    data: DocRecord
    setField: (fieldname: string, value: unknown) => void
    readOnly: boolean
  }) => ReactNode
  allowAttachments?: boolean
}

const layoutFieldTypes = new Set(['Section Break', 'Column Break', 'Tab Break'])

function makeLayout(fields: DocField[], doctype: string): LayoutTab[] {
  const tabs: LayoutTab[] = []
  let tabIndex = 0
  let sectionIndex = 0
  let columnIndex = 0
  let tab: LayoutTab = { name: `${doctype}-tab-${tabIndex}`, sections: [] }
  let section: LayoutSection = {
    name: `${doctype}-section-${sectionIndex}`,
    columns: [{ name: `${doctype}-column-${columnIndex}`, fields: [] }],
  }

  const pushSection = () => {
    if (section.columns.some((column) => column.fields.length)) tab.sections.push(section)
  }

  const pushTab = () => {
    pushSection()
    if (tab.sections.length) tabs.push(tab)
  }

  fields.forEach((field) => {
    if (field.fieldtype === 'Tab Break') {
      pushTab()
      tabIndex += 1
      sectionIndex = 0
      columnIndex = 0
      tab = { name: `${doctype}-tab-${tabIndex}`, label: field.label, sections: [] }
      section = {
        name: `${doctype}-section-${sectionIndex}`,
        columns: [{ name: `${doctype}-column-${columnIndex}`, fields: [] }],
      }
      return
    }
    if (field.fieldtype === 'Section Break') {
      pushSection()
      sectionIndex += 1
      columnIndex = 0
      section = {
        name: `${doctype}-section-${sectionIndex}`,
        label: field.label,
        columns: [{ name: `${doctype}-column-${columnIndex}`, fields: [] }],
      }
      return
    }
    if (field.fieldtype === 'Column Break') {
      columnIndex += 1
      section.columns.push({ name: `${doctype}-column-${columnIndex}`, fields: [] })
      return
    }
    if (!layoutFieldTypes.has(field.fieldtype)) section.columns[section.columns.length - 1]?.fields.push(field)
  })

  pushTab()
  return tabs
}

function fieldValueSeed(document: DocRecord, seed: Record<string, unknown>) {
  return Object.entries(seed).some(([field, value]) => document[field] !== value && !document[field])
}

export function HrmsDocumentForm({
  doctype,
  title,
  description,
  listPath,
  employee,
  docname,
  excludedFields = [],
  seed = {},
  renderExtras,
  allowAttachments = false,
}: HrmsDocumentFormProps) {
  const navigate = useNavigate()
  const { doctypeMeta, getFields } = useMeta(doctype)
  const bundle = useDocument(doctype, docname)
  const document = bundle.document
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fields = useMemo(
    () => getFields({ restrictNoValueFields: false }).filter((field) => !excludedFields.includes(field.fieldname)),
    [excludedFields, getFields],
  )
  const tabs = useMemo(() => makeLayout(fields, doctype), [doctype, fields])
  const currentSeed = useMemo(
    () => ({
      employee: employee?.name,
      employee_name: employee?.employee_name,
      company: employee?.company,
      department: employee?.department,
      ...seed,
    }),
    [employee, seed],
  )
  const readOnly = Boolean(docname && Number(document.doc?.docstatus ?? 0) > 0)

  useEffect(() => {
    if (!doctypeMeta || !('isNew' in document) || !document.isNew || !fieldValueSeed(document.doc ?? {}, currentSeed))
      return
    if ('setDoc' in document && typeof document.setDoc === 'function') {
      document.setDoc({ ...document.doc, ...currentSeed })
    }
  }, [currentSeed, document, doctypeMeta])

  async function submit() {
    const missing = findMissingMandatory(fields, document.doc ?? {}, {
      doctypesMeta: doctypeMeta ? { [doctype]: doctypeMeta } : {},
    })
    if (missing.length) {
      setError(__('Mandatory fields required: {0}', [missing.join(', ')]))
      return
    }
    setSaving(true)
    setError(null)
    try {
      await bundle.triggerOnBeforeCreate()
      await bundle.triggerOnValidate()
      if ('isNew' in document && document.isNew) {
        await rpc({ url: 'frappe.client.insert', params: { doc: document.doc ?? {} } })
      } else if ('save' in document && document.save) {
        await document.save.submit()
      }
      navigate(listPath)
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.messages.join('\n') || failure.message : toErrorMessage(failure))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-gray-9">{__(title)}</h1>
        <p className="mt-2 text-sm text-ink-gray-6">{__(description)}</p>
      </div>
      {!doctypeMeta || (docname && !document.doc) ? (
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : (
        <section className="rounded-xl border border-outline-gray-2 bg-surface-base p-4 sm:p-6">
          <FieldLayout tabs={tabs} data={document.doc ?? {}} doctype={doctype} />
          {renderExtras?.({ data: document.doc ?? {}, setField: document.setField, readOnly })}
          {allowAttachments && docname && <HrmsAttachments doctype={doctype} docname={docname} readOnly={readOnly} />}
          <ErrorMessage className="mt-5" message={error} />
          <div className="mt-6 flex justify-end gap-2 border-t border-outline-gray-2 pt-5">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              {__('Cancel')}
            </Button>
            <Button variant="solid" loading={saving} loadingText={__('Submitting')} onClick={() => void submit()}>
              {__('Submit')}
            </Button>
          </div>
        </section>
      )}
    </main>
  )
}
