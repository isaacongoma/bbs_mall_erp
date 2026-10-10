import { __, frappe } from '@/shared/frappe'

frappe.ui.form.on('Space Enquiry', {
  setup(frm: any) {
    frm.set_query('unit', () => ({ filters: { property: frm.doc.property, status: ['in', ['Vacant', 'Reserved']] } }))
  },
  refresh(frm: any) {
    if (frm.is_new() || frm.doc.lease) return
    frm.add_custom_button(__('Create Lease'), () => {
      frm.call({
        doc: frm.doc,
        method: 'make_lease',
        freeze: true,
        callback: (r: any) => {
          if (r.exc) return
          frappe.model.with_doctype('Lease Agreement', () => {
            const lease = frappe.model.get_new_doc('Lease Agreement')
            Object.entries(r.message).forEach(([field, value]) => {
              if (field !== 'units') lease[field] = value
            })
            ;((r.message.units || []) as any[]).forEach((unit) => {
              const row = frappe.model.add_child(lease, 'Lease Unit', 'units')
              Object.assign(row, unit)
            })
            frappe.set_route('Form', 'Lease Agreement', lease.name)
          })
        },
      })
    })
  },
  property(frm: any) {
    frm.set_value('unit', null)
  },
})
