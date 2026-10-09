import { frappe, refresh_field } from '@/shared/frappe'
frappe.ui.form.on('Quality Inspection', {
  before_load(frm?: any) {
    return frm.trigger('set_serial_no_from_number')
  },
  onload(frm?: any) {
    frm.trigger('set_default_company')
  },
  set_serial_no_from_number(frm?: any) {
    const { item_code, item_serial_no: number } = frm.doc
    if (!frm.is_new() || !item_code || !number) return
    return frappe
      .xcall('erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.get_serial_batch_scan', {
        item_code,
        number,
        doctype: 'Serial No',
      })
      .then((record?: any) => {
        frm.doc.item_serial_no = record?.name || number
      })
      .catch(() => {})
  },
  set_default_company(frm?: any) {
    if (frm.doc.docstatus === 0 && !frm.doc.company) {
      frm.set_value('company', frappe.defaults.get_default('company'))
    }
  },
  setup: function (frm?: any) {
    frm.set_query('reference_name', function (doc?: any) {
      const filters: any = { docstatus: ['!=', 2] }
      if (doc.company) {
        filters['company'] = doc.company
      }
      return {
        filters: filters,
      }
    })
    frm.set_query('batch_no', function () {
      return {
        filters: {
          item: frm.doc.item_code,
        },
      }
    })
    frm.set_query('item_serial_no', function () {
      let filters: any = {}
      if (frm.doc.item_code) {
        filters = {
          item_code: frm.doc.item_code,
        }
      }
      return { filters: filters }
    })
    frm.set_query('item_code', function (doc?: any) {
      if (doc.reference_type && doc.reference_name) {
        return {
          query: 'erpnext.stock.doctype.quality_inspection.quality_inspection.item_query',
          filters: {
            reference_doctype: doc.reference_type,
            reference_name: doc.reference_name,
            inspection_type: doc.inspection_type,
          },
        }
      }
    })
  },
  refresh: function (frm?: any) {
    frm.ignore_doctypes_on_cancel_all = [frm.doc.reference_type, 'Serial and Batch Bundle']
  },
  item_code: function (frm?: any) {
    if (frm.doc.item_code && !frm.doc.quality_inspection_template) {
      return frm.call({
        method: 'get_quality_inspection_template',
        doc: frm.doc,
        callback: function () {
          refresh_field(['quality_inspection_template', 'readings'])
        },
      })
    }
  },
  quality_inspection_template: function (frm?: any) {
    if (frm.doc.quality_inspection_template) {
      return frm.call({
        method: 'get_item_specification_details',
        doc: frm.doc,
        callback: function () {
          refresh_field('readings')
        },
      })
    }
  },
})
