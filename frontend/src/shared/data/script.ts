import { call } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { getRouter } from '@/core/navigation'
import { createListResource, type ListResource } from '@/core/resources'
import { toast } from '@/design-system'
import { useGlobalStore } from '../stores/globalStore'
import { getMeta, useMetaStore } from '../stores/metaStore'
import type { DocField } from '../types/meta'
import { createDocProxy, getClassNames } from '../utils/scriptHelpers'
import { renderFieldLayoutDialog } from '../utils/renderFieldLayoutDialog'

type AnyRecord = Record<string, any>
type Helpers = Record<string, any>

export interface CrmScriptRecord {
  name: string
  dt?: string
  view?: string
  script?: string
}

const doctypeScripts: Record<string, Record<string, CrmScriptRecord>> = {}
type FileScriptLoader = () => Promise<Record<string, unknown>>

const fileScriptModules: Record<string, FileScriptLoader> = {}
const fileScriptCache: Record<string, Record<string, unknown> | null> = {}

export function registerDoctypeScripts(modules: Record<string, FileScriptLoader>): void {
  for (const [path, loader] of Object.entries(modules)) {
    const match = /([^/]+)\/([^/]+)\.ts$/.exec(path)
    if (match) fileScriptModules[`${match[1]}/${match[2]}`] = loader
  }
}

async function loadFileScript(doctype: string, view: string) {
  const key = `${doctype}:${view}`
  if (key in fileScriptCache) return fileScriptCache[key]

  const slug = doctype.toLowerCase().replaceAll(' ', '_')
  const loader = fileScriptModules[`${slug}/${view.toLowerCase()}`]
  if (!loader) {
    fileScriptCache[key] = null
    return null
  }

  try {
    fileScriptCache[key] = await loader()
  } catch {
    fileScriptCache[key] = null
  }
  return fileScriptCache[key]
}

function evaluateFormClass(script: string, className: string, helpers: Helpers = {}) {
  const helperKeys = Object.keys(helpers)
  const helperValues = Object.values(helpers)
  const wrapped = `\n${script}\nreturn ${className};\n`
  return new Function(...helperKeys, wrapped)(...helperValues)
}

function defineListProperty(FormClass: { prototype: AnyRecord }, name: 'actions' | 'mappedCreates' | 'statuses') {
  if (Object.prototype.hasOwnProperty.call(FormClass.prototype, name)) return
  Object.defineProperty(FormClass.prototype, name, {
    configurable: true,
    enumerable: true,
    get(this: AnyRecord) {
      if (!this._originalDocumentContext) {
        console.warn(`CRM Script: _originalDocumentContext not found on instance for ${name} getter.`)
        return []
      }
      return this._originalDocumentContext[name]
    },
    set(this: AnyRecord, newValue: unknown) {
      if (!this._originalDocumentContext) {
        console.warn(`CRM Script: _originalDocumentContext not found on instance for ${name} setter.`)
        return
      }
      if (!Array.isArray(newValue)) {
        console.warn(`CRM Script: "${name}" property must be an array. Value was not set.`, newValue)
        this._originalDocumentContext[name] = []
        return
      }
      this._originalDocumentContext[name] = newValue
    },
  })
}

function setupHelperMethods(FormClass: { prototype: AnyRecord }) {
  const proto = FormClass.prototype

  if (typeof proto.addMappedCreate !== 'function') {
    proto.addMappedCreate = function (
      this: AnyRecord,
      label: string,
      method: string,
      args?: AnyRecord,
      selectedChildren?: AnyRecord,
    ) {
      const context = this._originalDocumentContext
      if (!context || !label || !method) return
      context.mappedCreates = [
        ...(context.mappedCreates || []).filter((item: AnyRecord) => item.label !== label),
        { label, method, args: args ?? null, selectedChildren: selectedChildren ?? null },
      ]
    }
  }

  if (typeof proto.openMappedDoc !== 'function') {
    proto.openMappedDoc = async function (
      this: AnyRecord,
      method: string,
      args?: AnyRecord,
      selectedChildren?: AnyRecord,
    ) {
      const context = this._originalDocumentContext
      const sourceName = context?.doc?.name
      if (!sourceName) return null
      const result = await call<AnyRecord>('frappe.model.mapper.make_mapped_doc', {
        method,
        source_name: sourceName,
        args: args ?? null,
        selected_children: selectedChildren ?? null,
      })
      const mapped = result?.message && typeof result.message === 'object' ? result.message : result
      if (!mapped?.doctype) return mapped
      getRouter().push({ name: 'Desk New Document', params: { doctype: String(mapped.doctype) } })
      return mapped
    }
  }

  if (typeof proto.getRow !== 'function') {
    proto.getRow = function (this: AnyRecord, parentField: string, idx?: number) {
      let rowIdx = idx || this.currentRowIdx
      let dt: string | null = null

      if (this instanceof Array) {
        const fields = getMeta((this as AnyRecord).doc.doctype).getFields()
        const field = fields.find((candidate) => candidate.fieldname === parentField)
        dt = field?.options?.replace(/\s+/g, '') ?? null

        if (!rowIdx && dt) {
          rowIdx = (this as AnyRecord[]).find((r) => (r._className || r.constructor.name) === dt)?.currentRowIdx
        }
      }

      if (!this.doc[parentField]) {
        console.warn(__('⚠️ No data found for parent field: {0}', [parentField]))
        return null
      }
      const row = this.doc[parentField].find((r: AnyRecord) => r.idx === rowIdx)

      if (!row) {
        console.warn(__('⚠️ No row found for idx: {0} in parent field: {1}', [rowIdx, parentField]))
        return null
      }

      row.parent = row.parent || this.doc.name

      if (this instanceof Array && dt) {
        return createDocProxy(
          row,
          (this as AnyRecord[]).find((r) => (r._className || r.constructor.name) === dt) as AnyRecord,
        )
      }
      return createDocProxy(row, this)
    }
  }

  defineListProperty(FormClass, 'actions')
  defineListProperty(FormClass, 'statuses')

  if (typeof proto.setFieldHtml !== 'function') {
    proto.setFieldHtml = function (this: AnyRecord, fieldname: string, html: string) {
      const context = this._originalDocumentContext
      if (!context) {
        console.warn('CRM Script: _originalDocumentContext not found on instance for setFieldHtml.')
        return
      }
      context.fieldHtmlMap = { ...(context.fieldHtmlMap || {}), [fieldname]: html }
    }
  }

  if (typeof proto.setFieldProperty !== 'function') {
    proto.setFieldProperty = function (
      this: AnyRecord,
      target: string,
      property: string,
      value: unknown,
      rowName?: string,
    ) {
      const context = this._originalDocumentContext
      if (!context) {
        console.warn('CRM Script: _originalDocumentContext not found on instance for setFieldProperty.')
        return
      }
      const key = rowName ? `${target}:${rowName}` : target
      const overrides = { ...(context.fieldPropertyOverrides || {}) }
      overrides[key] = { ...(overrides[key] || {}), [property]: value }
      context.fieldPropertyOverrides = overrides
    }
  }

  if (typeof proto.setFieldProperties !== 'function') {
    proto.setFieldProperties = function (this: AnyRecord, target: string, properties: AnyRecord, rowName?: string) {
      if (!properties || typeof properties !== 'object') return
      for (const [key, value] of Object.entries(properties)) this.setFieldProperty(target, key, value, rowName)
    }
  }

  if (typeof proto.removeFieldProperty !== 'function') {
    proto.removeFieldProperty = function (this: AnyRecord, target: string, property: string, rowName?: string) {
      const context = this._originalDocumentContext
      const key = rowName ? `${target}:${rowName}` : target
      if (!context?.fieldPropertyOverrides?.[key]) return
      const overrides = { ...context.fieldPropertyOverrides }
      const entry = { ...overrides[key] }
      delete entry[property]
      if (Object.keys(entry).length === 0) delete overrides[key]
      else overrides[key] = entry
      context.fieldPropertyOverrides = overrides
    }
  }

  if (typeof proto.setQuery !== 'function') {
    proto.setQuery = function (this: AnyRecord, target: string, query: unknown) {
      const filters = typeof query === 'function' ? query() : query
      if (!filters || typeof filters !== 'object') return
      this.setFieldProperty(target, 'link_filters', filters)
    }
  }

  if (typeof proto.set_query !== 'function') proto.set_query = proto.setQuery

  if (typeof proto.getField !== 'function') {
    proto.getField = function (this: AnyRecord, fieldname: string): DocField | null {
      const context = this._originalDocumentContext
      const dt = context?.doc?.doctype || ''
      if (!dt) return null

      const raw = useMetaStore.getState().doctypesMeta[dt]?.fields?.find((field) => field.fieldname === fieldname)
      if (!raw) return null
      const overrides = context?.fieldPropertyOverrides?.[fieldname] || {}
      return { ...raw, ...overrides }
    }
  }
}

export function getScript(doctype: string, view = 'Form') {
  const scripts: ListResource = createListResource({
    doctype: 'CRM Form Script',
    cache: ['Form Scripts', doctype, view],
    fields: ['name', 'dt', 'view', 'script'],
    filters: { view, dt: doctype, enabled: 1 },
    onSuccess: (records: CrmScriptRecord[]) => {
      for (const script of records) {
        if (!doctypeScripts[doctype]) doctypeScripts[doctype] = {}
        doctypeScripts[doctype][script.name] = script || {}
      }
    },
    onError: (error: unknown) => {
      console.error(`Error loading CRM Form Scripts for ${doctype} (view: ${view}):`, error)
    },
  })

  if (!doctypeScripts[doctype] && !scripts.list.loading) scripts.fetch()

  function setupFormController(
    FormClass: new () => AnyRecord,
    doctypesMeta: Record<string, any>,
    document: AnyRecord,
    helpers: Helpers,
    parentInstance: AnyRecord | null = null,
    isChildDoctype = false,
    childClassName = '',
  ) {
    document.actions = document.actions || []
    document.statuses = document.statuses || []

    const instance = new FormClass()
    instance._originalDocumentContext = document
    instance._isChildDoctype = isChildDoctype
    instance._parentInstance = parentInstance

    for (const key in helpers) instance[key] = helpers[key]
    for (const key in document) {
      if (Object.hasOwn(document, key)) instance[key] = document[key]
    }

    instance.getMeta = async (dt: string) => {
      if (!doctypesMeta[dt]) {
        await getMeta(dt).meta.fetch()
        return useMetaStore.getState().doctypesMeta[dt]
      }
      return doctypesMeta[dt]
    }

    const childField = isChildDoctype
      ? doctypesMeta[doctype]?.fields?.find(
          (field: DocField) =>
            field.fieldtype === 'Table' && String(field.options ?? '').replace(/\s+/g, '') === childClassName,
        )
      : null
    const getChildDoc = () => {
      const rows =
        childField && Array.isArray(document.doc?.[childField.fieldname])
          ? (document.doc[childField.fieldname] as AnyRecord[])
          : []
      const currentRow = rows.find((row) => row.idx === instance.currentRowIdx)
      return currentRow ?? rows[0] ?? {}
    }
    const getDoc = () => (isChildDoctype ? getChildDoc() : document.doc)
    const onSet = (prop: string | symbol, value: unknown) => {
      if (isChildDoctype && typeof prop === 'string') {
        getChildDoc()[prop] = value
        document.touch?.()
      } else if (typeof document.setField === 'function' && typeof prop === 'string') document.setField(prop, value)
      else if (document.doc) document.doc[prop as string] = value
    }

    if (isChildDoctype && parentInstance) {
      instance.doc = createDocProxy(getDoc, parentInstance, instance, onSet)
      if (!parentInstance._childInstances) parentInstance._childInstances = []
      parentInstance._childInstances.push(instance)
    } else {
      instance.doc = createDocProxy(getDoc, instance, null, onSet)
    }

    return instance
  }

  function setupMultipleFormControllers(
    fileModule: Record<string, unknown> | null,
    scriptStrings: Record<string, CrmScriptRecord> | undefined,
    document: AnyRecord,
    helpers: Helpers,
  ) {
    const controllers: AnyRecord[] = []
    let parentInstanceIdx: number | null = null
    const doctypeName = doctype.replace(/\s+/g, '')
    const doctypesMeta = useMetaStore.getState().doctypesMeta

    function addController(FormClass: new () => AnyRecord, className: string) {
      setupHelperMethods(FormClass as unknown as { prototype: AnyRecord })

      let parentInstance: AnyRecord | null = null
      const isChildDoctype = className !== doctypeName

      if (isChildDoctype) {
        if (!controllers.length) {
          console.error(
            __(
              '⚠️ No class found for doctype: {0}, it is mandatory to have a class for the parent doctype. it can be empty, but it should be present.',
              [doctype],
            ),
          )
          return
        }
        parentInstance = controllers[parentInstanceIdx ?? 0] ?? null
      } else {
        parentInstanceIdx = controllers.length || 0
      }

      const instance = setupFormController(
        FormClass,
        doctypesMeta,
        document,
        helpers,
        parentInstance,
        isChildDoctype,
        className,
      )
      instance._className = className
      controllers.push(instance)
    }

    if (fileModule) {
      try {
        for (const [name, exported] of Object.entries(fileModule)) {
          if (typeof exported === 'function') addController(exported as new () => AnyRecord, name)
        }
      } catch (error) {
        console.error(__('Failed to load file-based form controller: {0}', [String(error)]))
      }
    }

    for (const scriptName in scriptStrings) {
      const script = scriptStrings[scriptName]?.script
      if (!script) continue
      try {
        for (const className of getClassNames(script)) {
          const FormClass = evaluateFormClass(script, className, helpers)
          if (FormClass) addController(FormClass, className)
        }
      } catch (error) {
        console.error(__('Failed to load form controller: {0}', [String(error)]))
      }
    }

    return controllers
  }

  async function setupScript(document: AnyRecord, helpers: Helpers = {}) {
    const [fileModule] = await Promise.all([loadFileScript(doctype, view), scripts.list.promise])

    const { $dialog, $socket } = useGlobalStore.getState()

    helpers.createDialog = $dialog
    helpers.toast = toast
    helpers.socket = $socket
    helpers.router = getRouter()
    helpers.call = call
    helpers.formDialog = renderFieldLayoutDialog
    helpers.throwError = (message?: string) => {
      toast.error(message || __('An error occurred'))
      throw new Error(message || __('An error occurred'))
    }

    const scriptDefs = doctypeScripts[doctype]
    const hasFileScript = fileModule != null
    const hasDbScripts = scriptDefs && Object.keys(scriptDefs).length > 0
    if (!hasFileScript && !hasDbScripts) return null

    return setupMultipleFormControllers(fileModule ?? null, scriptDefs, document, helpers)
  }

  return { scripts, setupScript, setupFormController }
}
