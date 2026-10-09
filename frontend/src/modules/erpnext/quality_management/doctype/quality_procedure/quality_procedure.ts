import { frappe } from '@/shared/frappe'
frappe.ui.form.on('Quality Procedure', {
  refresh: function (frm?: any) {
    frm.set_query('procedure', 'processes', (frm?: any) => {
      return {
        filters: {
          name:
            frm.parent_quality_procedure == null
              ? ['!=', frm.name]
              : ['not in', [frm.name, frm.parent_quality_procedure]],
        },
      }
    })
    frm.set_query('parent_quality_procedure', function () {
      return {
        filters: {
          is_group: 1,
          name: ['!=', frm.doc.name],
        },
      }
    })
  },
})
