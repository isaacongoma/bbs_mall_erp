import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UIProvider } from '@/design-system'
import { FrappeFormBody } from '../components/FrappeFormBody'
import { FrappeFormToolbar } from '../components/FrappeFormToolbar'
import { resetHandlers } from '../frappe/testing'
import { readPage } from '../frappe/formAdapter'
import { openForm, resetForms } from '../frappe/formView'
import { setDeskBoot } from '../frappe/boot'
import { registerMeta } from '../frappe/meta'
import { frappe } from '../frappe'

vi.mock('../hooks/useUsers', () => ({
  useUsers: () => ({
    crmUsers: [],
    allUsers: [],
    getUser: () => ({ full_name: 'Tester', name: 'tester' }),
    isManager: () => false,
  }),
}))

type AnyRecord = Record<string, any>

function field(fieldname: string, fieldtype = 'Data', extra: AnyRecord = {}) {
  return { doctype: 'DocField', name: `${fieldname}-df`, fieldname, fieldtype, label: fieldname, parent: 'View Doc', ...extra }
}

beforeEach(() => {
  resetHandlers()
  resetForms()
  setDeskBoot({
    user: { name: 'admin@example.com', roles: ['System Manager'], can_read: ['View Doc'], can_write: ['View Doc'], can_create: ['View Doc'] },
    sysdefaults: { float_precision: 3, currency_precision: 2, date_format: 'yyyy-mm-dd', number_format: '#,###.##' },
    desk_settings: { dashboard: 1, timeline: 1, form_sidebar: 1 },
  })
  registerMeta([
    {
      doctype: 'DocType',
      name: 'View Doc',
      module: 'Test',
      istable: 0,
      permissions: [{ role: 'System Manager', permlevel: 0, read: 1, write: 1, create: 1, delete: 1 }],
      fields: [
        field('title', 'Data', { reqd: 1 }),
        field('status', 'Select', { options: '\nOpen\nClosed' }),
        field('notes', 'Small Text', { depends_on: 'eval:doc.status == "Open"' }),
      ],
    },
  ])
})

function mount(frm: AnyRecord) {
  return render(
    <MemoryRouter>
      <UIProvider>
        <div id="app-header" />
        <FrappeFormBody frm={frm} />
      </UIProvider>
    </MemoryRouter>,
  )
}

describe('Frappe form view', () => {
  it('renders the upstream form fields and writes edits back through the control', async () => {
    frappe.ui.form.on('View Doc', {
      refresh: (frm: AnyRecord) => {
        frm.set_intro('Draft record', 'blue')
      },
    })
    const frm = await openForm('View Doc')
    mount(frm)
    await waitFor(() => expect(screen.getByText('title')).toBeInTheDocument())
    expect(screen.getByText('Draft record')).toBeInTheDocument()
    expect(screen.queryByText('notes')).not.toBeInTheDocument()

    const input = screen.getAllByRole('textbox')[0] as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Quarterly review' } })
    fireEvent.blur(input)
    await waitFor(() => expect(frm.doc.title).toBe('Quarterly review'))
    expect(frm.is_dirty()).toBe(true)
  })

  it('exposes standard page actions for a new document', async () => {
    const frm = await openForm('View Doc')
    const page = readPage(frm)
    expect(page?.primary?.label).toBe('Save')
    act(() => {
      render(
        <MemoryRouter>
          <UIProvider>
            <div id="app-header" />
            <FrappeFormToolbar page={page!} dirty={false} />
          </UIProvider>
        </MemoryRouter>,
      )
    })
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
