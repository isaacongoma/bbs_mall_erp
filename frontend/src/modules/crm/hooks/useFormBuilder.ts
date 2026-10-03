import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { toast } from '@/design-system'
import {
  BREAK_TYPES,
  MAX_COLUMNS,
  buildSections,
  docLabel,
  flattenSections,
  makeMarker,
  newColumn,
  newSection,
  serializeFields,
  slugify,
  type CatalogField,
  type FormField,
  type FormSection,
  type FormState,
  type HiddenField,
} from '../utils/formBuilder'

type AnyRecord = Record<string, any>

const EMPTY_FORM = (name: string): FormState => ({
  name,
  title: '',
  route: '',
  document_type: 'CRM Lead',
  description: '',
  submit_button_label: 'Submit',
  success_message: '',
  redirect_url: '',
  allowed_embedding_domains: '',
  published: 0,
})

function toHidden(row: AnyRecord): HiddenField {
  return {
    fieldname: row.fieldname,
    label: row.label,
    fieldtype: row.fieldtype,
    options: row.options || '',
    default: row.default ?? '',
  }
}

export function useFormBuilder(name: string, onSaved: () => void) {
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [form, setForm] = useState<FormState>(() => EMPTY_FORM(name))
  const [sections, setSections] = useState<FormSection[]>([])
  const [hiddenFields, setHiddenFields] = useState<HiddenField[]>([])
  const [catalog, setCatalog] = useState<CatalogField[]>([])
  const [linkOptions, setLinkOptions] = useState<Record<string, string[]>>({})
  const [guestSelect, setGuestSelect] = useState<Record<string, boolean>>({})
  const [grantingSelect, setGrantingSelect] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const savedPublished = useRef(false)
  const routeEdited = useRef(false)
  const requested = useRef(new Set<string>())
  const latest = useRef({ form, sections, hiddenFields, catalog, saving })

  useEffect(() => {
    latest.current = { form, sections, hiddenFields, catalog, saving }
  })

  const fields = flattenSections(sections)
  const mandatory = new Set(catalog.filter((field) => field.reqd).map((field) => field.fieldname))
  const hiddenMissingDefault = hiddenFields.some((hidden) => !String(hidden.default || '').trim())

  function markDirty() {
    setDirty(true)
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }))
    markDirty()
  }

  function ensureLinkOptions(doctype?: string) {
    if (!doctype || requested.current.has(`options:${doctype}`)) return
    requested.current.add(`options:${doctype}`)
    void rpc<AnyRecord[]>({
      url: 'frappe.client.get_list',
      params: { doctype, fields: ['name'], limit_page_length: 0, order_by: 'name asc' },
    })
      .then((rows) => setLinkOptions((current) => ({ ...current, [doctype]: (rows || []).map((row) => row.name) })))
      .catch(() => setLinkOptions((current) => ({ ...current, [doctype]: [] })))
  }

  function ensureGuestSelect(doctype?: string) {
    if (!doctype || requested.current.has(`guest:${doctype}`)) return
    requested.current.add(`guest:${doctype}`)
    setGuestSelect((current) => ({ ...current, [doctype]: true }))
    void rpc<AnyRecord>({ url: 'crm.api.form.link_field_guest_access', params: { doctype } })
      .then((result) => setGuestSelect((current) => ({ ...current, [doctype]: Boolean(result?.guest_can_select) })))
      .catch(() => setGuestSelect((current) => ({ ...current, [doctype]: true })))
  }

  function ensureLinkMeta(doctype?: string) {
    ensureLinkOptions(doctype)
    ensureGuestSelect(doctype)
  }

  async function grantGuestSelect(doctype?: string) {
    if (!doctype || grantingSelect[doctype]) return
    setGrantingSelect((current) => ({ ...current, [doctype]: true }))
    try {
      const result = await rpc<AnyRecord>({ url: 'crm.api.form.grant_guest_link_access', params: { doctype } })
      const allowed = Boolean(result?.guest_can_select)
      setGuestSelect((current) => ({ ...current, [doctype]: allowed }))
      if (allowed) {
        requested.current.delete(`options:${doctype}`)
        ensureLinkOptions(doctype)
        toast.success(__('Guests can now select {0} records.', [doctype]))
      }
    } catch (failure) {
      toast.error(toErrorMessage(failure) || __('Could not grant guest access.'))
    } finally {
      setGrantingSelect((current) => ({ ...current, [doctype]: false }))
    }
  }

  async function loadCatalog(documentType: string): Promise<CatalogField[]> {
    const result = await rpc<CatalogField[]>({
      url: 'crm.api.form.get_form_fields',
      params: { document_type: documentType },
    })
    setCatalog(result || [])
    return result || []
  }

  const applyConfig = useEffectEvent((doc: AnyRecord) => {
    const loadedFields: FormField[] = (doc.fields || []).map((field: AnyRecord) => ({
      name: field.name,
      fieldname: field.fieldname,
      label: field.label,
      fieldtype: field.fieldtype,
      options: field.options,
      reqd: Boolean(field.reqd),
      placeholder: field.placeholder,
      field_description: field.field_description,
      depends_on: field.depends_on || '',
      mandatory_depends_on: field.mandatory_depends_on || '',
      read_only_depends_on: field.read_only_depends_on || '',
    }))
    const hidden = (doc.hidden_fields || []).map(toHidden)
    setForm({
      name,
      title: doc.title || '',
      route: doc.route || '',
      document_type: doc.document_type || 'CRM Lead',
      description: doc.description || '',
      submit_button_label: doc.submit_button_label || 'Submit',
      success_message: doc.success_message || '',
      redirect_url: doc.redirect_url || '',
      allowed_embedding_domains: doc.allowed_embedding_domains || '',
      published: doc.published || 0,
    })
    savedPublished.current = Boolean(doc.published)
    setHiddenFields(hidden)
    hidden.forEach((row: HiddenField) => row.fieldtype === 'Link' && ensureLinkOptions(row.options))
    loadedFields.forEach((field) => field.fieldtype === 'Link' && ensureLinkMeta(field.options))
    setSections(buildSections(loadedFields))
    routeEdited.current = !/^untitled-form(-\d+)?$/.test(doc.route || '')
    setLoaded(true)
    void loadCatalog(doc.document_type || 'CRM Lead')
  })

  useEffect(() => {
    let cancelled = false
    void rpc<AnyRecord>({ url: 'crm.api.form.get_form_config', params: { name } }).then((doc) => {
      if (!cancelled) applyConfig(doc)
    })
    return () => {
      cancelled = true
    }
  }, [name])

  function commitSections(next: FormSection[]) {
    setSections(next)
    markDirty()
  }

  function onTitleChange(title: string) {
    setForm((current) => ({
      ...current,
      title,
      route: !routeEdited.current && !current.published ? slugify(title) : current.route,
    }))
    markDirty()
  }

  function onRouteChange(route: string) {
    routeEdited.current = true
    patchForm({ route })
  }

  function updateField(fieldname: string, patch: Partial<FormField>) {
    commitSections(
      sections.map((section) => ({
        ...section,
        columns: section.columns.map((column) => ({
          ...column,
          items: column.items.map((item) => (item.fieldname === fieldname ? { ...item, ...patch } : item)),
        })),
      })),
    )
  }

  function updateSection(id: string, patch: Partial<FormSection>, secPatch?: Partial<FormField>) {
    const next = sections.map((section) =>
      section.id === id
        ? { ...section, ...patch, secField: secPatch ? { ...section.secField, ...secPatch } : section.secField }
        : section,
    )
    if (secPatch) commitSections(next)
    else setSections(next)
  }

  function addFieldToColumn(columnId: string, option: AnyRecord | null) {
    const catalogField = (option?.af ?? option) as CatalogField | null
    if (!catalogField?.fieldname) return
    setExpanded(null)
    setHiddenFields((current) => current.filter((hidden) => hidden.fieldname !== catalogField.fieldname))
    const item: FormField = {
      fieldname: catalogField.fieldname,
      label: catalogField.label,
      fieldtype: catalogField.fieldtype,
      options: catalogField.options,
      reqd: Boolean(catalogField.reqd),
      placeholder: '',
      field_description: '',
      depends_on: '',
      mandatory_depends_on: '',
      read_only_depends_on: '',
    }
    if (catalogField.fieldtype === 'Link') ensureLinkMeta(catalogField.options)
    commitSections(
      sections.map((section) => ({
        ...section,
        columns: section.columns.map((column) =>
          column.id === columnId ? { ...column, items: [...column.items, item] } : column,
        ),
      })),
    )
  }

  function addSection() {
    commitSections([...sections, newSection()])
  }

  function addColumn(sectionId: string) {
    const section = sections.find((candidate) => candidate.id === sectionId)
    if (!section) return
    if (section.columns.length >= MAX_COLUMNS) {
      toast.info(__('A section can have up to {0} columns', [MAX_COLUMNS]))
      return
    }
    commitSections(
      sections.map((candidate) =>
        candidate.id === sectionId
          ? { ...candidate, columns: [...candidate.columns, newColumn(makeMarker('Column Break'))] }
          : candidate,
      ),
    )
  }

  function removeLastColumn(sectionId: string) {
    commitSections(
      sections.map((section) => {
        if (section.id !== sectionId || section.columns.length <= 1) return section
        const columns = section.columns.slice(0, -1)
        const last = section.columns[section.columns.length - 1]
        const previous = columns[columns.length - 1]
        if (last && previous && last.items.length) {
          columns[columns.length - 1] = { ...previous, items: [...previous.items, ...last.items] }
        }
        return { ...section, columns }
      }),
    )
  }

  function removeSection(sectionId: string) {
    const marker = sections.find((section) => section.id === sectionId)?.secField
    if (!marker) return
    commitSections(buildSections(flattenSections(sections).filter((field) => field !== marker)))
  }

  function removeField(field: FormField) {
    if (expanded === field.fieldname) setExpanded(null)
    const remaining = sections.map((section) => ({
      ...section,
      columns: section.columns.map((column) => ({ ...column, items: column.items.filter((item) => item !== field) })),
    }))
    if (
      mandatory.has(field.fieldname) &&
      !BREAK_TYPES.includes(field.fieldtype) &&
      !hiddenFields.some((hidden) => hidden.fieldname === field.fieldname)
    ) {
      const seed = catalog.find((candidate) => candidate.fieldname === field.fieldname)?.default || ''
      setHiddenFields((current) => [
        ...current,
        {
          fieldname: field.fieldname,
          label: field.label,
          fieldtype: field.fieldtype,
          options: field.options || '',
          default: seed,
        },
      ])
      toast.info(__('{0} moved to hidden required fields. Set a default value.', [field.label || field.fieldname]))
    }
    commitSections(remaining)
  }

  function updateHiddenDefault(fieldname: string, value: string) {
    setHiddenFields((current) =>
      current.map((hidden) => (hidden.fieldname === fieldname ? { ...hidden, default: value } : hidden)),
    )
    markDirty()
  }

  function toggleExpanded(field: FormField) {
    setExpanded((current) => (current === field.fieldname ? null : field.fieldname))
  }

  async function commitDoctype(newDoctype: string, valid: Set<string>) {
    patchForm({ document_type: newDoctype })
    setExpanded(null)
    const nextCatalog = await loadCatalog(newDoctype)
    const before = fields.length
    const catalogByName = new Map(nextCatalog.map((field) => [field.fieldname, field]))
    const kept = fields
      .filter((field) => BREAK_TYPES.includes(field.fieldtype) || valid.has(field.fieldname))
      .map((field) => {
        const entry = catalogByName.get(field.fieldname)
        if (!entry) return field
        if (field.fieldtype === 'Link') ensureLinkMeta(entry.options)
        return { ...field, options: entry.options, reqd: entry.reqd ? true : field.reqd }
      })
    const dropped = before - kept.length
    const seeded = await rpc<AnyRecord[]>({
      url: 'crm.api.form.get_hidden_seed',
      params: { document_type: newDoctype },
    })
    const stillMandatory = latest.current.hiddenFields.filter(
      (hidden) => catalogByName.has(hidden.fieldname) && catalogByName.get(hidden.fieldname)?.reqd,
    )
    const nextHidden = [...(seeded || []).map(toHidden), ...stillMandatory]
    nextHidden.forEach((hidden) => hidden.fieldtype === 'Link' && ensureLinkOptions(hidden.options))
    setHiddenFields(nextHidden)
    commitSections(buildSections(kept))
    if (dropped) toast.info(__('{0} field(s) removed. Not available on {1}.', [dropped, docLabel(newDoctype)]))
  }

  async function requestDoctypeChange(newDoctype: string, confirm: (message: string, accept: () => void) => void) {
    if (!newDoctype || newDoctype === form.document_type) return
    const nextFields = await rpc<CatalogField[]>({
      url: 'crm.api.form.get_form_fields',
      params: { document_type: newDoctype },
    })
    const valid = new Set((nextFields || []).map((field) => field.fieldname))
    const wouldDrop = fields.filter(
      (field) => !BREAK_TYPES.includes(field.fieldtype) && !valid.has(field.fieldname),
    ).length
    if (!wouldDrop) {
      void commitDoctype(newDoctype, valid)
      return
    }
    confirm(
      __("Switching to {0} will remove {1} field(s) that don't exist on {0}. This can't be undone.", [
        docLabel(newDoctype),
        wouldDrop,
      ]),
      () => void commitDoctype(newDoctype, valid),
    )
  }

  async function save(silent = false): Promise<boolean> {
    const current = latest.current
    if (current.form.published) {
      const missing = current.hiddenFields.filter((hidden) => !String(hidden.default || '').trim())
      if (missing.length) {
        if (!silent) {
          toast.error(
            __('Set a default value for hidden required field(s): {0}', [
              missing.map((hidden) => hidden.label || hidden.fieldname).join(', '),
            ]),
          )
        }
        return false
      }
    }
    if (current.saving) return false
    setSaving(true)
    const payloadFields = flattenSections(current.sections)
    try {
      const doc = await rpc<AnyRecord>({
        url: 'crm.api.form.save_form',
        params: {
          name: current.form.name,
          form: {
            title: current.form.title,
            route: current.form.route,
            document_type: current.form.document_type,
            description: current.form.description,
            submit_button_label: current.form.submit_button_label,
            success_message: current.form.success_message,
            redirect_url: current.form.redirect_url,
            allowed_embedding_domains: current.form.allowed_embedding_domains,
            published: current.form.published ? 1 : 0,
            fields: serializeFields(payloadFields),
            hidden_fields: current.hiddenFields.map((hidden) => ({
              fieldname: hidden.fieldname,
              label: hidden.label,
              fieldtype: hidden.fieldtype,
              options: hidden.options,
              default: hidden.default,
            })),
          },
        },
      })
      setForm((previous) => ({ ...previous, route: doc.route }))
      savedPublished.current = Boolean(current.form.published)
      setDirty(false)
      onSaved()
      return true
    } catch (failure) {
      if (!silent) toast.error(toErrorMessage(failure) || __('Could not save'))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveNow() {
    if (!dirty || saving) return
    if (await save()) toast.success(__('Form updated'))
  }

  function togglePublish() {
    patchForm({ published: form.published ? 0 : 1 })
  }

  return {
    loaded,
    saving,
    dirty,
    form,
    fields,
    sections,
    hiddenFields,
    catalog,
    linkOptions,
    guestSelect,
    grantingSelect,
    expanded,
    mandatory,
    hiddenMissingDefault,
    patchForm,
    onTitleChange,
    onRouteChange,
    setExpanded,
    setSections,
    commitSections,
    updateSection,
    updateField,
    addFieldToColumn,
    addSection,
    addColumn,
    removeLastColumn,
    removeSection,
    removeField,
    updateHiddenDefault,
    toggleExpanded,
    ensureLinkMeta,
    grantGuestSelect,
    requestDoctypeChange,
    saveNow,
    togglePublish,
  }
}
