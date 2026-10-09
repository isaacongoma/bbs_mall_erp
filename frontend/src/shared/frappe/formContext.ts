import type { FieldLayoutStandaloneContext } from '../components/FieldLayout'
import type { FieldLayoutGridOps, FieldLayoutGridUi, FieldLinkQuery } from '../hooks/useFieldLayout'
import type { DocField } from '../types/meta'
import { $, frappe } from './runtime'

type AnyRecord = Record<string, any>


const cellControls = new WeakMap<AnyRecord, Map<string, AnyRecord>>()

function childFieldDef(row: AnyRecord, fieldname: string): DocField | undefined {
  return frappe.meta.get_docfield(row.doctype, fieldname, row.name) as DocField | undefined
}

function cellControl(frm: AnyRecord, row: AnyRecord, fieldname: string): AnyRecord | undefined {
  let controls = cellControls.get(row)
  if (!controls) {
    controls = new Map()
    cellControls.set(row, controls)
  }
  const existing = controls.get(fieldname)
  if (existing) return existing
  const df = childFieldDef(row, fieldname)
  if (!df) return undefined
  const grid = frm.fields_dict[row.parentfield]?.grid
  const control = frappe.ui.form.make_control({
    df,
    doctype: row.doctype,
    docname: row.name,
    doc: row,
    frm,
    grid,
    parent: $('<div></div>'),
    only_input: true,
    render_input: true,
  })
  if (control) controls.set(fieldname, control)
  return control
}

function findGrid(frm: AnyRecord, table: string): AnyRecord | undefined {
  return frm.fields_dict[table]?.grid
}

function getQueryFor(frm: AnyRecord, fieldname: string, row?: AnyRecord | null): FieldLinkQuery | undefined {
  let getQuery: ((...args: unknown[]) => unknown) | undefined
  let control: AnyRecord | undefined
  if (row) {
    const grid = findGrid(frm, row.parentfield)
    control = grid?.get_field?.(fieldname)
    getQuery = control?.get_query ?? control?.df?.get_query
  } else {
    control = frm.fields_dict[fieldname]
    getQuery = control?.get_query ?? control?.df?.get_query
  }
  if (typeof getQuery !== 'function') return undefined
  try {
    const result = row
      ? getQuery.call(control, frm.doc, row.doctype, row.name)
      : getQuery.call(control, frm.doc, frm.doctype, frm.docname)
    if (!result || typeof result !== 'object') return undefined
    const { query, filters } = result as AnyRecord
    return { query, filters }
  } catch {
    return undefined
  }
}

export function gridUiFor(frm: AnyRecord, table: string): FieldLayoutGridUi | undefined {
  const grid = findGrid(frm, table)
  if (!grid) return undefined
  const buttons: FieldLayoutGridUi['customButtons'] = []
  for (const [label, element] of Object.entries((grid.custom_buttons ?? {}) as Record<string, JQuery>)) {
    if (element.hasClass('hidden')) continue
    buttons.push({ label, action: () => element.trigger('click') })
  }
  const hidden = new Set<string>()
  for (const df of (grid.docfields ?? []) as AnyRecord[]) {
    if (df.hidden) hidden.add(df.fieldname)
  }
  return {
    hiddenColumns: hidden,
    cannotAddRows: Boolean(grid.cannot_add_rows || grid.df?.cannot_add_rows),
    cannotDeleteRows: Boolean(grid.cannot_delete_rows || grid.df?.cannot_delete_rows),
    sortable: typeof grid.is_sortable === 'function' ? Boolean(grid.is_sortable()) : true,
    customButtons: buttons,
    multipleAdd: grid.multiple_set ? () => $(grid.wrapper).find('.grid-add-multiple-rows').trigger('click') : undefined,
    download: $(grid.wrapper).find('.grid-download').length && !$(grid.wrapper).find('.grid-download').hasClass('hidden')
      ? () => $(grid.wrapper).find('.grid-download').trigger('click')
      : undefined,
    upload: $(grid.wrapper).find('.grid-upload').length && !$(grid.wrapper).find('.grid-upload').hasClass('hidden')
      ? () => $(grid.wrapper).find('.grid-upload').trigger('click')
      : undefined,
  }
}

export function gridOpsFor(frm: AnyRecord, table: string): FieldLayoutGridOps | undefined {
  const grid = findGrid(frm, table)
  if (!grid) return undefined
  const check = (names: Set<string>) => {
    for (const row of (frm.doc[table] ?? []) as AnyRecord[]) row.__checked = names.has(row.name) ? 1 : 0
  }
  return {
    addRow: () => {
      grid.add_new_row(null, null, false, null, true)
    },
    deleteRows: (names) => {
      check(names)
      grid.delete_rows()
    },
    duplicateRows: (names) => {
      check(names)
      grid.duplicate_rows()
    },
    reorder: (rows) => {
      const parent = frm.doc as AnyRecord
      rows.forEach((row, index) => {
        row.idx = index + 1
      })
      parent[table] = rows
      frm.dirty()
      void frm.script_manager.trigger(`${table}_move`, grid.doctype)
    },
  }
}

function columnOverrides(frm: AnyRecord, overrides: Record<string, Partial<DocField>>): void {
  for (const df of (frm.meta?.fields ?? frm.fields ?? []) as AnyRecord[]) {
    if (df.fieldtype !== 'Table') continue
    const grid = findGrid(frm, df.fieldname)
    if (!grid) continue
    for (const column of (grid.docfields ?? []) as AnyRecord[]) {
      overrides[`${df.fieldname}.${column.fieldname}`] = {
        hidden: column.hidden ? 1 : 0,
        read_only: column.read_only ? 1 : 0,
        reqd: column.reqd ? 1 : 0,
        label: column.label,
        options: column.options,
        description: column.description,
      } as Partial<DocField>
    }
    const copies = frappe.meta.docfield_copy?.[df.options] ?? {}
    for (const [rowName, fields] of Object.entries(copies as AnyRecord)) {
      for (const [fieldname, copy] of Object.entries(fields as AnyRecord)) {
        const entry = copy as AnyRecord
        overrides[`${df.fieldname}.${fieldname}:${rowName}`] = {
          hidden: entry.hidden ? 1 : 0,
          read_only: entry.read_only ? 1 : 0,
          reqd: entry.reqd ? 1 : 0,
        } as Partial<DocField>
      }
    }
  }
}

export function buildFieldContext(
  frm: AnyRecord,
  base: Record<string, Partial<DocField>>,
): FieldLayoutStandaloneContext {
  const overrides: Record<string, Partial<DocField>> = { ...base }
  columnOverrides(frm, overrides)
  return {
    fieldPropertyOverrides: overrides,
    onFieldChange: (fieldname, value, row) => {
      if (row?.name && row.doctype) {
        const control = cellControl(frm, row, fieldname)
        if (control) void control.parse_validate_and_set_in_model(value)
        else void frappe.model.set_value(row.doctype, row.name, fieldname, value)
        return
      }
      const control = frm.fields_dict[fieldname]
      if (control?.parse_validate_and_set_in_model) void control.parse_validate_and_set_in_model(value)
      else void frm.set_value(fieldname, value)
    },
    onButton: async (fieldname, row) => {
      if (row?.doctype) {
        await frm.script_manager.trigger(fieldname, row.doctype, row.name)
        return
      }
      const control = frm.fields_dict[fieldname]
      if (typeof control?.df?.click === 'function') control.df.click.call(control)
      await frm.script_manager.trigger(fieldname, frm.doctype, frm.docname)
    },
    resolveLinkQuery: (fieldname, row) => getQueryFor(frm, fieldname, row),
    registerHtmlHost: (fieldname, element, row) => {
      if (row || !element) return
      const control = frm.fields_dict[fieldname]
      if (!control?.$wrapper) return
      const host = $(element)
      const content = control.$wrapper
      if (content[0] && content[0].parentElement !== element) {
        host.empty()
        host.append(content)
      }
    },
    gridUi: (table) => gridUiFor(frm, table),
    gridOps: (table) => gridOpsFor(frm, table),
  }
}
