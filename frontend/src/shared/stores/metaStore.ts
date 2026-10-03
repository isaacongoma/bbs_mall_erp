import { create } from 'zustand'
import { getSysDefaults } from '@/core/boot'
import { __ } from '@/core/i18n'
import { createResource, type Resource } from '@/core/resources'
import type { DocField, DocRecord, DocTypeLoadResponse, DocTypeMeta } from '../types/meta'
import { noValueFieldTypes, standardFieldsMeta } from '../utils/model'
import { formatCurrency, formatNumber } from '../utils/numberFormat'

interface MetaState {
  doctypesMeta: Record<string, DocTypeMeta>
  userSettings: Record<string, any>
  setMeta: (response: DocTypeLoadResponse, doctype: string) => void
  setUserSettings: (doctype: string, settings: any) => void
}

function parseUserSettings(raw: string | undefined): any {
  try {
    return JSON.parse(raw || '{}')
  } catch {
    return {}
  }
}

export const useMetaStore = create<MetaState>((set) => ({
  doctypesMeta: {},
  userSettings: {},
  setMeta(response, doctype) {
    set((state) => {
      const doctypesMeta = { ...state.doctypesMeta }
      for (const meta of response.docs) doctypesMeta[meta.name] = meta
      return {
        doctypesMeta,
        userSettings: { ...state.userSettings, [doctype]: parseUserSettings(response.user_settings) },
      }
    })
  },
  setUserSettings(doctype, settings) {
    set((state) => ({ userSettings: { ...state.userSettings, [doctype]: settings } }))
  },
}))

const resources = new Map<string, Resource<DocTypeLoadResponse>>()

export function getMetaResource(doctype: string): Resource<DocTypeLoadResponse> {
  let resource = resources.get(doctype)
  if (!resource) {
    resource = createResource<DocTypeLoadResponse>({
      url: 'frappe.desk.form.load.getdoctype',
      params: { doctype, with_parent: 1, cached_timestamp: null },
      cache: ['Meta', doctype],
      onData: (response) => useMetaStore.getState().setMeta(response, doctype),
    })
    resources.set(doctype, resource)
  }
  return resource
}

export function fetchMeta(doctype: string): Resource<DocTypeLoadResponse> {
  const resource = getMetaResource(doctype)
  if (!useMetaStore.getState().doctypesMeta[doctype] && !resource.loading && !resource.fetched) {
    void resource.fetch().catch(() => undefined)
  }
  return resource
}

export interface GetFieldsOptions {
  dt?: string
  withStandardFields?: boolean
  restrictNoValueFields?: boolean
  restrictedFieldTypes?: string[]
}

export interface MetaApi {
  meta: Resource<DocTypeLoadResponse>
  doctype: string
  getDoctypeMeta: () => DocTypeMeta | null
  getFields: (options?: GetFieldsOptions) => DocField[]
  getGridSettings: () => DocTypeMeta | Record<string, never>
  getGridViewSettings: (parentDoctype: string) => Record<string, any>
  saveUserSettings: (parentDoctype: string, key: string, value: unknown, callback?: () => void) => Resource | void
  getFloatWithPrecision: (fieldname: string, doc: DocRecord) => string
  getCurrencyWithPrecision: (fieldname: string, doc: DocRecord) => string
  getFormattedFloat: (fieldname: string, doc: DocRecord) => string
  getFormattedPercent: (fieldname: string, doc: DocRecord) => string
  getFormattedCurrency: (fieldname: string, doc: DocRecord, parentDoc?: DocRecord | null) => string
  isTranslatable: (dt?: string | null) => boolean
}

function precisionOf(df: DocField | undefined): number | null {
  const precision = df?.precision
  return precision ? Number(precision) : null
}

export function createMetaApi(
  doctype: string,
  doctypesMeta: Record<string, DocTypeMeta>,
  userSettings: Record<string, any>,
): MetaApi {
  const meta = getMetaResource(doctype)
  const fieldDef = (fieldname: string) => doctypesMeta[doctype]?.fields.find((field) => field.fieldname === fieldname)

  const getFloatWithPrecision = (fieldname: string, doc: DocRecord) =>
    formatNumber(doc[fieldname], '', precisionOf(fieldDef(fieldname)))

  const getFormattedPercent = (fieldname: string, doc: DocRecord) => `${getFloatWithPrecision(fieldname, doc)}%`

  const getCurrencyWithPrecision = (fieldname: string, doc: DocRecord) =>
    formatCurrency(doc[fieldname], '', '', precisionOf(fieldDef(fieldname)))

  const getFormattedCurrency = (fieldname: string, doc: DocRecord, parentDoc: DocRecord | null = null) => {
    let currency = getSysDefaults().currency || 'USD'
    const df = fieldDef(fieldname)

    if (df && df.options && df.options.indexOf(':') === -1) {
      if (doc && doc[df.options]) currency = doc[df.options]
      else if (parentDoc && parentDoc[df.options]) currency = parentDoc[df.options]
    }

    return formatCurrency(doc[fieldname], '', currency, precisionOf(df))
  }

  const getFields = (options: GetFieldsOptions = {}): DocField[] => {
    const {
      dt = doctype,
      withStandardFields = false,
      restrictNoValueFields = true,
      restrictedFieldTypes = [],
    } = options

    let fieldsMeta: DocField[] =
      doctypesMeta[dt]?.fields
        .filter(
          (field) =>
            !field.hidden &&
            (!restrictNoValueFields || !noValueFieldTypes.includes(field.fieldtype)) &&
            (!restrictedFieldTypes.length || !restrictedFieldTypes.includes(field.fieldtype)),
        )
        .map((field) => {
          const next: DocField = { ...field }
          if (next.fieldtype === 'Select' && typeof next.options === 'string') {
            const parsed = next.options.split('\n').map((option: string) => ({ label: __(option), value: option }))
            if (parsed[0]?.value !== '' && next.reqd !== 1) parsed.unshift({ label: '', value: '' })
            next.options = parsed
          }
          if (next.fieldtype === 'Link' && next.options === 'User') next.fieldtype = 'User'
          return next
        }) || []

    if (withStandardFields) fieldsMeta = fieldsMeta.concat(standardFieldsMeta)
    return fieldsMeta
  }

  const saveUserSettings = (parentDoctype: string, key: string, value: unknown, callback?: () => void) => {
    const current = useMetaStore.getState().userSettings
    const oldSettings = current[parentDoctype] || userSettings[parentDoctype] || {}
    const newSettings = JSON.parse(JSON.stringify(oldSettings))

    if (newSettings[key] === undefined) newSettings[key] = { [doctype]: value }
    else newSettings[key][doctype] = value

    if (JSON.stringify(oldSettings) !== JSON.stringify(newSettings)) {
      return createResource({
        url: 'frappe.model.utils.user_settings.save',
        params: { doctype: parentDoctype, user_settings: JSON.stringify(newSettings) },
        auto: true,
        onSuccess: () => {
          useMetaStore.getState().setUserSettings(parentDoctype, newSettings)
          callback?.()
        },
      })
    }
    useMetaStore.getState().setUserSettings(parentDoctype, newSettings)
    return callback?.()
  }

  return {
    meta,
    doctype,
    getDoctypeMeta: () => doctypesMeta[doctype] ?? null,
    getFields,
    getGridSettings: () => doctypesMeta[doctype] ?? {},
    getGridViewSettings: (parentDoctype) => userSettings[parentDoctype]?.GridView?.[doctype] ?? {},
    saveUserSettings,
    getFloatWithPrecision,
    getCurrencyWithPrecision,
    getFormattedFloat: getFloatWithPrecision,
    getFormattedPercent,
    getFormattedCurrency,
    isTranslatable: (dt) => {
      const target = dt || doctype
      const targetMeta = doctypesMeta[target]
      return Boolean(targetMeta && targetMeta.translated_doctype)
    },
  }
}

export function getMeta(doctype: string): MetaApi {
  fetchMeta(doctype)
  const { doctypesMeta, userSettings } = useMetaStore.getState()
  return createMetaApi(doctype, doctypesMeta, userSettings)
}
