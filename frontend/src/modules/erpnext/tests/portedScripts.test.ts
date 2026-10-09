import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { frappe } from '@/shared/frappe'
import { setDeskBoot } from '@/shared/frappe/boot'
import { openForm, resetForms } from '@/shared/frappe/formView'
import { registerMeta } from '@/shared/frappe/meta'
import { resetModel } from '@/shared/frappe/testing'

type AnyRecord = Record<string, any>

function field(fieldname: string, fieldtype = 'Data', extra: AnyRecord = {}) {
  return { doctype: 'DocField', fieldname, fieldtype, label: fieldname, ...extra }
}

function defineDoctype(name: string, fields: AnyRecord[], write = true) {
  registerMeta([
    {
      doctype: 'DocType',
      name,
      module: 'Test',
      istable: 0,
      permissions: [{ role: 'System Manager', permlevel: 0, read: 1, write: write ? 1 : 0, create: 1, delete: 1 }],
      fields: fields.map((entry) => ({ ...entry, name: `${name}-${entry.fieldname}`, parent: name })),
    },
  ])
}

function seed(doctype: string, doc: AnyRecord) {
  frappe.model.sync({
    docs: [{ doctype, docstatus: 0, ...doc }],
    docinfo: { doctype, name: doc.name, attachments: [], comments: [], communications: [], versions: [] },
  })
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 30))
}

function labels(frm: AnyRecord): string[] {
  return frm.page.inner_toolbar
    .find('[data-label]')
    .toArray()
    .map((element: HTMLElement) => decodeURIComponent(element.getAttribute('data-label') ?? ''))
}

beforeEach(() => {
  resetModel()
  resetForms()
  setDeskBoot({
    user: { name: 'admin@example.com', roles: ['System Manager'], can_read: [], can_write: [], can_create: [] },
    sysdefaults: { float_precision: 3, currency_precision: 2, date_format: 'yyyy-mm-dd', number_format: '#,###.##' },
    desk_settings: { dashboard: 1, timeline: 1, form_sidebar: 1 },
  })
})

describe('ported Department script', () => {
  beforeAll(async () => {
    await import('../setup/doctype/department/department')
  })

  beforeEach(() => {
    defineDoctype('Department', [
      field('department_name'),
      field('parent_department', 'Link', { options: 'Department' }),
      field('is_group', 'Check'),
    ])
  })

  it('makes a saved root department read-only with the original intro', async () => {
    seed('Department', { name: 'All Departments', parent_department: '' })
    const frm = await openForm('Department', 'All Departments')
    await settle()
    expect(frm.perm[0].write).toBeFalsy()
    expect(frm.layout.message.text()).toContain('This is a root department and cannot be edited.')
  })

  it('leaves a department with a parent editable', async () => {
    seed('Department', { name: 'Sales', parent_department: 'All Departments' })
    const frm = await openForm('Department', 'Sales')
    await settle()
    expect(frm.perm[0].write).toBeTruthy()
    expect(frm.layout.message.text()).not.toContain('root department')
  })

  it('restricts the parent department query to groups', async () => {
    seed('Department', { name: 'Sales', parent_department: 'All Departments' })
    const frm = await openForm('Department', 'Sales')
    await settle()
    const query = frm.fields_dict.parent_department.get_query(frm.doc)
    expect(query).toEqual({ filters: [['Department', 'is_group', '=', 1]] })
  })

  it('refuses to save the root node', async () => {
    seed('Department', { name: 'All Departments' })
    const frm = await openForm('Department', 'All Departments')
    await settle()
    await expect(frm.script_manager.trigger('validate')).rejects.toThrow('You cannot edit the root node.')
  })
})

describe('ported Account script', () => {
  beforeAll(async () => {
    await import('../accounts/doctype/account/account')
  })

  beforeEach(() => {
    defineDoctype('Account', [
      field('account_name'),
      field('account_number'),
      field('company', 'Link', { options: 'Company' }),
      field('parent_account', 'Link', { options: 'Account' }),
      field('is_group', 'Check'),
      field('root_type', 'Select', { options: '\nAsset\nLiability' }),
      field('report_type', 'Select'),
      field('account_type', 'Select', { options: '\nCash\nTax' }),
      field('account_category', 'Link', { options: 'Account Category' }),
      field('tax_rate', 'Float'),
      field('warehouse', 'Link', { options: 'Warehouse' }),
      field('freeze_account', 'Select'),
    ])
  })

  it('shows the root account intro and keeps the write actions for a root account', async () => {
    seed('Account', { name: 'Assets - T', is_group: 1, parent_account: '' })
    const frm = await openForm('Account', 'Assets - T')
    await settle()
    expect(frm.layout.message.text()).toContain('This is a root account and cannot be edited.')
    expect(labels(frm)).toEqual(expect.arrayContaining(['Merge Account', 'Update Account Name / Number']))
  })

  it('offers merge and rename actions to users who can write', async () => {
    seed('Account', { name: 'Cash - T', is_group: 0, parent_account: 'Assets - T', account_type: 'Cash' })
    const frm = await openForm('Account', 'Cash - T')
    await settle()
    expect(labels(frm)).toEqual(
      expect.arrayContaining(['Merge Account', 'Update Account Name / Number', 'Chart of Accounts']),
    )
  })

  it('shows the tax rate only for tax accounts', async () => {
    seed('Account', { name: 'VAT - T', is_group: 0, parent_account: 'Liabilities - T', account_type: 'Tax' })
    const frm = await openForm('Account', 'VAT - T')
    await settle()
    expect(frm.fields_dict.tax_rate.df.hidden).toBeFalsy()
    await frm.fields_dict.account_type.parse_validate_and_set_in_model('Cash')
    await settle()
    expect(frm.fields_dict.tax_rate.df.hidden).toBe(1)
  })

  it('clears the account category when the root type changes', async () => {
    seed('Account', { name: 'Cash - T', root_type: 'Asset', account_category: 'Bank' })
    const frm = await openForm('Account', 'Cash - T')
    await settle()
    await frm.fields_dict.root_type.parse_validate_and_set_in_model('Liability')
    await settle()
    expect(frm.doc.account_category).toBe('')
  })

  it('limits parent accounts to groups of the same company', async () => {
    seed('Account', { name: 'Cash - T', company: 'T' })
    const frm = await openForm('Account', 'Cash - T')
    await settle()
    const query = frm.fields_dict.parent_account.get_query(frm.doc)
    expect(query).toEqual({ filters: { is_group: 1, company: 'T' } })
  })
})
