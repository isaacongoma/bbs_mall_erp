import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('DuckDB Sync', {
  refresh: function (frm?: any) {
    frm.set_query('doc_type', function () {
      return {
        filters: {
          istable: 0,
          issingle: 0,
          is_virtual: 0,
        },
      }
    })
    if (frm.doc.docstatus == 1) {
      frappe.call({
        method: 'frappe.core.doctype.duckdb_sync.duckdb_sync.is_data_sync_pending',
        args: {
          docname: frm.doc.name,
        },
        callback: function (r?: any) {
          if (r.message) {
            frm.add_custom_button(__('Sync Data'), function () {
              frappe.call({
                method: 'frappe.core.doctype.duckdb_sync.duckdb_sync.start_data_sync',
                args: {
                  docname: frm.doc.name,
                },
              })
            })
          }
        },
      })
    }
  },
})
