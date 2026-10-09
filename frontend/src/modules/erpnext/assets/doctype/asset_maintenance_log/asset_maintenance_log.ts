import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Asset Maintenance Log', {
  asset_maintenance: (frm?: any) => {
    frm.set_query('task', function (doc?: any) {
      return {
        query: 'erpnext.assets.doctype.asset_maintenance_log.asset_maintenance_log.get_maintenance_tasks',
        filters: {
          asset_maintenance: doc.asset_maintenance,
        },
      }
    })
  },
})
