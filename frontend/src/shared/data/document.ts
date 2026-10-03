import { call } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import {
  createDocumentResource,
  createResource,
  Observable,
  ObservableValue,
  type DocumentResource,
  type DocRecord,
  type Resource,
} from '@/core/resources'
import { toast } from '@/design-system'
import { getAttachmentTracker } from '../hooks/useAttachments'
import { useGlobalStore } from '../stores/globalStore'
import { getMeta, useMetaStore } from '../stores/metaStore'
import { useUiStore } from '../stores/uiStore'
import type { DocField } from '../types/meta'
import { parseAssignees, type Assignee } from '../utils/assignees'
import { runSequentially } from '../utils/collections'
import { getFetchSource, getFieldsToFetch, getPendingFetchFields, getSourceFieldnames } from '../utils/fetchFrom'
import { findMissingMandatory } from '../utils/fieldTransforms'
import { sanitizeText } from '../utils/text'
import { getScript } from './script'

type AnyRecord = Record<string, any>

export interface DocumentExtras {
  actions: AnyRecord[]
  statuses: AnyRecord[]
  fieldHtmlMap: Record<string, string>
  fieldPropertyOverrides: Record<string, Partial<DocField>>
}

export class NewDocument extends Observable {
  doc: DocRecord
  readonly isNew = true

  constructor(doctype: string) {
    super()
    this.doc = { __newDocument: true, doctype }
  }

  readonly setField = (key: string, value: unknown): void => {
    this.doc = { ...this.doc, [key]: value }
    this.touch()
  }

  readonly setDoc = (next: DocRecord | ((current: DocRecord) => DocRecord)): void => {
    this.doc = typeof next === 'function' ? next(this.doc) : next
    this.touch()
  }
}

export type CrmDocument = (DocumentResource | NewDocument) & DocumentExtras

const documentsCache: Record<string, Record<string, CrmDocument>> = {}
const controllersCache: Record<string, Record<string, AnyRecord>> = {}
const assigneesCache: Record<string, Record<string, Resource<Assignee[], string[]>>> = {}
const permissionsCache: Record<string, Record<string, Resource>> = {}
const errorHolders: Record<string, Record<string, ObservableValue<any>>> = {}
const intentionallyDeletedDocs = new Set<string>()

export function markDocumentAsDeleted(doctype: string, docname: string): void {
  intentionallyDeletedDocs.add(`${doctype}:${docname}`)
}

export function expireDeletionMarker(doctype: string, docname: string): void {
  const key = `${doctype}:${docname}`
  setTimeout(() => intentionallyDeletedDocs.delete(key), 10000)
}

export function unmarkDocumentAsDeleted(doctype: string, docname: string): void {
  intentionallyDeletedDocs.delete(`${doctype}:${docname}`)
}

function attachExtras<T extends Observable>(target: T): T & DocumentExtras {
  const state: DocumentExtras = { actions: [], statuses: [], fieldHtmlMap: {}, fieldPropertyOverrides: {} }
  for (const key of Object.keys(state) as Array<keyof DocumentExtras>) {
    Object.defineProperty(target, key, {
      enumerable: false,
      configurable: true,
      get: () => state[key],
      set: (value) => {
        ;(state as AnyRecord)[key] = value
        target.touch()
      },
    })
  }
  return target as T & DocumentExtras
}

function ensureError(doctype: string, docname: string): ObservableValue<any> {
  errorHolders[doctype] = errorHolders[doctype] || {}
  if (!errorHolders[doctype][docname]) errorHolders[doctype][docname] = new ObservableValue<any>('')
  return errorHolders[doctype][docname]
}

export interface DocumentBundle {
  document: CrmDocument
  assignees: Resource<Assignee[], string[]>
  permissions: Resource
  scripts: ReturnType<typeof getScript>['scripts']
  error: ObservableValue<any>
  getControllers: (row?: AnyRecord | null) => AnyRecord[]
  triggerOnLoad: () => Promise<void>
  triggerOnRender: () => Promise<void>
  triggerOnBeforeCreate: (...args: unknown[]) => Promise<void>
  triggerOnValidate: () => Promise<void>
  triggerOnSave: () => Promise<void>
  triggerOnError: () => Promise<void>
  triggerOnChange: (fieldname: string, value: unknown, row?: AnyRecord | null) => Promise<void>
  triggerButton: (fieldname: string, row?: AnyRecord | null) => Promise<void>
  triggerOnRowAdd: (row: AnyRecord) => Promise<void>
  triggerOnRowRemove: (selectedRows: Set<string>, rows: AnyRecord[]) => Promise<void>
  setupFormScript: () => Promise<void>
  triggerOnCreateLead: (...args: unknown[]) => Promise<void>
  triggerConvertToDeal: (...args: unknown[]) => Promise<void>
  setFieldHtml: (fieldname: string, html: string) => void
}

const bundles = new Map<string, DocumentBundle>()

export interface DocumentOverrides {
  [key: string]: any
}

export function getDocumentBundle(
  doctype: string,
  rawDocname?: string | number | null,
  resourceOverrides: DocumentOverrides = {},
): DocumentBundle {
  const docname = rawDocname == null ? '' : String(rawDocname)
  const bundleKey = `${doctype}::${docname}`
  const cached = bundles.get(bundleKey)
  if (cached) return cached

  const { setupScript, scripts } = getScript(doctype)
  const { trackOldFile, processPendingDeletions } = getAttachmentTracker(doctype, docname)
  documentsCache[doctype] = documentsCache[doctype] || {}
  const error = ensureError(doctype, docname)

  const current = (): CrmDocument => documentsCache[doctype]![docname] as CrmDocument

  const triggerOnSaveRef = { fn: async () => undefined as void }
  const triggerOnErrorRef = { fn: async () => undefined as void }
  const triggerOnValidateRef = { fn: async () => undefined as void }

  if (!documentsCache[doctype]![docname]) {
    if (docname) {
      const resource = createDocumentResource({
        doctype,
        name: docname,
        onSuccess: async () => {
          await setupFormScript()
        },
        onError: (err: any) => {
          const deletionKey = `${doctype}:${docname}`
          if (err?.exc_type === 'DoesNotExistError' && intentionallyDeletedDocs.has(deletionKey)) {
            intentionallyDeletedDocs.delete(deletionKey)
            return
          }
          error.set(err)
          if (err?.exc_type === 'DoesNotExistError') {
            toast.error(__(err.messages?.[0] || 'Document does not exist'))
          }
          if (err?.exc_type === 'PermissionError') {
            toast.error(__(err.messages?.[0] || 'You do not have permission to access this document'))
          }
        },
        setValue: {
          onSuccess: () => {
            void triggerOnSaveRef.fn()
            toast.success(__('Document updated successfully'))
            processPendingDeletions()
          },
          onError: (err: any) => {
            void triggerOnErrorRef.fn()

            if (err?.exc_type === 'MandatoryError') {
              const fieldName = (err.messages as string[])
                .map((message) => {
                  const parts = message.split(': ')
                  return (parts[parts.length - 1] ?? '').trim()
                })
                .join(', ')
              toast.error(__('Mandatory field error: {0}', [fieldName]))
              return
            }

            err?.messages?.forEach((message: string) => toast.error(message))
            if (!err?.messages?.length) toast.error(__('An error occurred while updating the document'))
            console.error(err)
          },
        },
        ...resourceOverrides,
      }) as DocumentResource

      const document = attachExtras(resource)
      documentsCache[doctype]![docname] = document

      const save = resource.save
      const originalSubmit = save.submit
      Object.assign(save, {
        submit: async (...args: any[]) => {
          try {
            await triggerOnValidateRef.fn()
          } catch (err) {
            console.error(err)
            return undefined
          }
          if (checkMandatory(resource.doc)) return undefined
          return (originalSubmit as (...a: any[]) => Promise<unknown>)(...args)
        },
      })
    } else {
      documentsCache[doctype]![''] = attachExtras(new NewDocument(doctype))
    }
  }

  assigneesCache[doctype] = assigneesCache[doctype] || {}
  if (!assigneesCache[doctype]![docname]) {
    assigneesCache[doctype]![docname] = createResource<Assignee[], string[]>({
      url: 'crm.api.doc.get_assigned_users',
      cache: `assignees:${doctype}:${docname}`,
      auto: Boolean(docname),
      params: { doctype, name: docname },
      transform: (data) => parseAssignees(data),
    })
  }

  permissionsCache[doctype] = permissionsCache[doctype] || {}
  if (!permissionsCache[doctype]![docname]) {
    permissionsCache[doctype]![docname] = createResource({
      url: 'frappe.client.get_doc_permissions',
      cache: `permissions:${doctype}:${docname}`,
      auto: Boolean(docname),
      params: { doctype, docname },
      initialData: { permissions: {} },
    })
  }

  async function setupFormScript(): Promise<void> {
    if (controllersCache[doctype] && typeof controllersCache[doctype]![docname] === 'object') return

    if (!controllersCache[doctype]) controllersCache[doctype] = {}
    controllersCache[doctype]![docname] = {}

    const { makeCall } = useGlobalStore.getState()
    const helpers: AnyRecord = {
      crm: {
        makePhoneCall: makeCall,
        openSettings: (page: string) => {
          useUiStore.getState().set({ showSettings: true, activeSettingsPage: page })
        },
      },
    }

    const controllersArray = await setupScript(current(), helpers)
    if (!controllersArray || controllersArray.length === 0) return

    const organized: Record<string, AnyRecord[]> = {}
    for (const controller of controllersArray) {
      const key = controller._className || controller.constructor.name
      if (!organized[key]) organized[key] = []
      organized[key].push(controller)
    }
    controllersCache[doctype]![docname] = organized

    await triggerOnLoad()
    await triggerOnRender()
  }

  function getControllers(row: AnyRecord | null = null): AnyRecord[] {
    const targetDoctype = row?.doctype || doctype
    const controllerKey = targetDoctype.replace(/\s+/g, '')
    const docControllers = controllersCache[doctype]?.[docname]
    if (typeof docControllers === 'object' && docControllers !== null && !Array.isArray(docControllers)) {
      return docControllers[controllerKey] || []
    }
    return []
  }

  function checkMandatory(doc: DocRecord | null): string | undefined {
    const doctypesMeta = useMetaStore.getState().doctypesMeta
    const fields = doctypesMeta[doctype]?.fields || []
    if (!fields.length) return undefined

    const overrides = current()?.fieldPropertyOverrides || {}
    const missing = findMissingMandatory(fields, doc, { propertyOverrides: overrides, doctypesMeta })

    if (missing.length > 0) {
      const message = __('Mandatory fields required: {0}', [missing.join(', ')])
      toast.error(message)
      return message
    }
    return undefined
  }

  async function trigger(taskFn: (this: AnyRecord) => Promise<void>, row: AnyRecord | null = null) {
    const controllers = getControllers(row)
    if (!controllers.length) return
    await runSequentially(controllers.map((controller) => async () => await taskFn.call(controller)))
  }

  async function triggerOnLoad() {
    await trigger(async function () {
      await (this.onLoad?.() || this.on_load?.() || this.onload?.())
    })
  }

  async function triggerOnRender() {
    await trigger(async function () {
      await (this.onRender?.() || this.on_render?.() || this.refresh?.())
    })
  }

  async function triggerOnBeforeCreate(...args: unknown[]) {
    await trigger(async function () {
      await (this.onBeforeCreate?.(...args) || this.on_before_create?.(...args))
    })
  }

  async function triggerOnValidate() {
    await trigger(async function () {
      await (this.onValidate?.() || this.on_validate?.() || this.validate?.())
    })
  }

  async function triggerOnSave() {
    await trigger(async function () {
      await (this.onSave?.() || this.on_save?.())
    })
  }

  async function triggerOnError() {
    await trigger(async function () {
      await (this.onError?.() || this.on_error?.())
    })
  }

  triggerOnSaveRef.fn = triggerOnSave
  triggerOnErrorRef.fn = triggerOnError
  triggerOnValidateRef.fn = triggerOnValidate

  async function fetchLinkValues(linkDoctype: string, linkValue: unknown, sourceFieldnames: string[]) {
    try {
      return await call<AnyRecord>('frappe.client.get_value', {
        doctype: linkDoctype,
        filters: linkValue,
        fieldname: sourceFieldnames,
      })
    } catch (err) {
      console.warn('Could not fetch linked values from', linkDoctype, err)
      return {}
    }
  }

  function writeTarget(target: AnyRecord | null, key: string, value: unknown) {
    if (!target) return
    if (target === current().doc) (current() as { setField: (k: string, v: unknown) => void }).setField(key, value)
    else {
      target[key] = value
      current().touch()
    }
  }

  async function applyFetchFrom(fieldname: string, value: unknown, row?: AnyRecord | null) {
    const target: AnyRecord | null = row || current().doc
    const targetDoctype = row?.doctype || doctype
    const fields = useMetaStore.getState().doctypesMeta[targetDoctype]?.fields || []

    const linkDf = fields.find((field) => field.fieldname === fieldname)
    if (typeof linkDf?.options !== 'string') return

    const fieldsToFetch = getFieldsToFetch(fields, fieldname)
    if (!fieldsToFetch.length) return

    if (!value) {
      fieldsToFetch.forEach((field) => writeTarget(target, field.fieldname, null))
      return
    }

    const pending = getPendingFetchFields(fields, fieldname, target ?? {})
    if (!pending.length) return

    const linkValues = await fetchLinkValues(linkDf.options, value, getSourceFieldnames(pending))
    const latestTarget: AnyRecord | null = row || current().doc
    if (latestTarget?.[fieldname] !== value) return
    if (!Object.keys(linkValues).length) return

    pending.forEach((field) => {
      const source = getFetchSource(field.fetch_from)?.source ?? ''
      writeTarget(latestTarget, field.fieldname, linkValues[source] ?? null)
    })
  }

  async function triggerOnChange(fieldname: string, rawValue: unknown, row?: AnyRecord | null) {
    const value = sanitizeText(rawValue)
    let oldValue: unknown = null
    if (row) {
      oldValue = row[fieldname]
      row[fieldname] = value
      current().touch()
    } else {
      oldValue = (current().doc as AnyRecord)[fieldname]
      ;(current() as { setField: (k: string, v: unknown) => void }).setField(fieldname, value)
      trackOldFile(oldValue, value)
    }

    await applyFetchFrom(fieldname, value, row)

    const handler = async function (this: AnyRecord) {
      this.value = value
      this.oldValue = oldValue
      if (row) this.currentRowIdx = row.idx
      await this[fieldname]?.()
    }

    try {
      await trigger(handler, row ?? null)
    } catch (err) {
      console.error(handler)
      throw err
    }
  }

  async function triggerButton(fieldname: string, row?: AnyRecord | null) {
    await trigger(async function () {
      if (row) this.currentRowIdx = row.idx
      await this[fieldname]?.()
    }, row ?? null)
  }

  async function triggerOnRowAdd(row: AnyRecord) {
    await trigger(async function () {
      this.currentRowIdx = row.idx
      this.value = row
      await this[`${row.parentfield}_add`]?.()
    }, row)
  }

  async function triggerOnRowRemove(selectedRows: Set<string>, rows: AnyRecord[]) {
    await trigger(async function () {
      if (selectedRows.size === 1) {
        const selected = Array.from(selectedRows)[0]
        this.currentRowIdx = rows.find((r) => r.name === selected)?.idx
      } else {
        delete this.currentRowIdx
      }
      this.selectedRows = Array.from(selectedRows)
      this.rows = rows
      await this[`${rows[0]?.parentfield}_remove`]?.()
    }, rows[0] ?? null)
  }

  async function triggerOnCreateLead(...args: unknown[]) {
    await trigger(async function () {
      await (this.onCreateLead?.(...args) || this.on_create_lead?.(...args))
    })
  }

  async function triggerConvertToDeal(...args: unknown[]) {
    await trigger(async function () {
      await (this.convertToDeal?.(...args) || this.convert_to_deal?.(...args))
    })
  }

  function setFieldHtml(fieldname: string, html: string) {
    const document = current()
    document.fieldHtmlMap = { ...(document.fieldHtmlMap || {}), [fieldname]: html }
  }

  const bundle: DocumentBundle = {
    document: current(),
    assignees: assigneesCache[doctype]![docname]!,
    permissions: permissionsCache[doctype]![docname]!,
    scripts,
    error,
    getControllers,
    triggerOnLoad,
    triggerOnRender,
    triggerOnBeforeCreate,
    triggerOnValidate,
    triggerOnSave,
    triggerOnError,
    triggerOnChange,
    triggerButton,
    triggerOnRowAdd,
    triggerOnRowRemove,
    setupFormScript,
    triggerOnCreateLead,
    triggerConvertToDeal,
    setFieldHtml,
  }
  bundles.set(bundleKey, bundle)
  getMeta(doctype)
  return bundle
}
