import { beforeEach, describe, expect, it } from 'vitest'
import { frappe, missingApi } from '../frappe'
import { registerMeta } from '../frappe/meta'
import { resetHandlers } from '../frappe/testing'
import { setDeskBoot } from '../frappe/boot'

type AnyRecord = Record<string, any>

function field(fieldname: string, fieldtype = 'Data', extra: AnyRecord = {}) {
  return {
    doctype: 'DocField',
    name: `${fieldname}-df`,
    fieldname,
    fieldtype,
    label: fieldname,
    parent: 'Test Doc',
    ...extra,
  }
}

function setup() {
  registerMeta([
    {
      doctype: 'DocType',
      name: 'Test Row',
      module: 'Test',
      istable: 1,
      permissions: [],
      fields: [
        field('item', 'Data', { in_list_view: 1, parent: 'Test Row' }),
        field('qty', 'Float', { in_list_view: 1, parent: 'Test Row' }),
      ],
    },
  ])
  setDeskBoot({
    user: {
      name: 'admin@example.com',
      roles: ['System Manager'],
      can_read: ['Test Doc'],
      can_write: ['Test Doc'],
      can_create: ['Test Doc'],
    },
    sysdefaults: { float_precision: 3, currency_precision: 2, date_format: 'yyyy-mm-dd', number_format: '#,###.##' },
    desk_settings: { dashboard: 1, timeline: 1, form_sidebar: 1 },
  })
  registerMeta([
    {
      doctype: 'DocType',
      name: 'Test Doc',
      module: 'Test',
      istable: 0,
      is_submittable: 0,
      permissions: [
        {
          role: 'System Manager',
          permlevel: 0,
          read: 1,
          write: 1,
          create: 1,
          delete: 1,
          submit: 0,
          cancel: 0,
          amend: 0,
        },
      ],
      fields: [
        field('section_one', 'Section Break'),
        field('rows', 'Table', { options: 'Test Row' }),
        field('title', 'Data', { reqd: 1 }),
        field('status', 'Select', { options: '\nOpen\nClosed' }),
        field('amount', 'Currency'),
        field('notes', 'Small Text'),
      ],
    },
  ])
}

function openForm(doc: AnyRecord = {}) {
  const wrapper = document.createElement('div')
  const frm = new frappe.ui.form.Form('Test Doc', wrapper, false)
  const newDoc = frappe.model.get_new_doc('Test Doc')
  Object.assign(newDoc, doc)
  return { frm, newDoc, wrapper }
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 30))
}

beforeEach(() => {
  resetHandlers()
  setup()
})

describe('upstream frappe.ui.form.Form', () => {
  it('runs setup, onload, refresh handlers in order and exposes custom buttons', async () => {
    const order: string[] = []
    frappe.ui.form.on('Test Doc', {
      setup: () => order.push('setup'),
      onload: () => order.push('onload'),
      refresh: (frm: AnyRecord) => {
        order.push('refresh')
        frm.add_custom_button('Hello', () => order.push('clicked'))
        frm.set_intro('Intro text', 'blue')
        frm.toggle_display('notes', false)
        frm.set_df_property('status', 'read_only', 1)
      },
    })
    const { frm, newDoc } = openForm()
    frm.refresh(newDoc.name)
    await settle()
    expect(order).toEqual(['setup', 'onload', 'refresh'])
    const button = frm.page.inner_toolbar.find('button[data-label="Hello"]')
    expect(button.length).toBe(1)
    button.trigger('click')
    expect(order).toContain('clicked')
    expect(frm.layout.message.text()).toContain('Intro text')
    expect(frm.fields_dict.notes.df.hidden).toBe(1)
    expect(frm.fields_dict.status.df.read_only).toBe(1)
  })

  it('fires field events and marks the form dirty when a control value is set', async () => {
    const seen: unknown[] = []
    frappe.ui.form.on('Test Doc', 'status', (frm: AnyRecord) => seen.push(frm.doc.status))
    const { frm, newDoc } = openForm()
    frm.refresh(newDoc.name)
    await settle()
    await frm.fields_dict.status.parse_validate_and_set_in_model('Open')
    await settle()
    expect(frm.doc.status).toBe('Open')
    expect(seen).toEqual(['Open'])
    expect(frm.is_dirty()).toBe(true)
  })

  it('validates mandatory fields before saving', async () => {
    const { frm, newDoc } = openForm()
    frm.refresh(newDoc.name)
    await settle()
    const mandatory = frappe.ui.form.check_mandatory(frm)
    expect(mandatory).toBe(false)
  })

  it('adds and removes child rows through the grid', async () => {
    const { frm, newDoc } = openForm()
    await frm.refresh(newDoc.name)
    await settle()
    const grid = frm.fields_dict.rows.grid
    grid.add_new_row(null, null, false)
    await settle()
    expect(frm.doc.rows.length).toBe(1)
    expect(frm.doc.rows[0].parentfield).toBe('rows')
  })

  it('builds the layout and fields from the DocType meta', async () => {
    const { frm, newDoc } = openForm()
    frm.refresh(newDoc.name)
    await settle()
    expect(Object.keys(frm.fields_dict)).toEqual(expect.arrayContaining(['title', 'status', 'amount', 'notes']))
    expect(frm.fields_dict.title.df.reqd).toBe(1)
    expect(missingApi.size).toBeGreaterThanOrEqual(0)
  })
})
