import { frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Accounting Dimension Filter', {
  refresh: function (frm?: any) {
    const help_content = `<table class="table table-bordered" style="background-color: var(--scrollbar-track-color);">
				<tr><td>
					<p>
						<svg class="icon icon-sm"><use href="#icon-info"></use></svg>
						{{__('Note: On checking Is Mandatory the accounting dimension will become mandatory against that specific account for all accounting transactions')}}
					</p>
				</td></tr>
			</table>`
    frm.set_df_property('dimension_filter_help', 'options', help_content)
  },
  onload: function (frm?: any) {
    frm.set_query('applicable_on_account', 'accounts', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
    frappe.db.get_list('Accounting Dimension', { fields: ['document_type'] }).then((res?: any) => {
      const options: any = ['Cost Center', 'Project']
      res.forEach((dimension?: any) => {
        options.push(dimension.document_type)
      })
      frm.set_df_property('accounting_dimension', 'options', options)
    })
    frm.trigger('setup_filters')
  },
  setup_filters: function (frm?: any) {
    const filters: any = {}
    if (frm.doc.accounting_dimension) {
      frappe.model.with_doctype(frm.doc.accounting_dimension, function () {
        if (frappe.model.is_tree(frm.doc.accounting_dimension)) {
          filters['is_group'] = 0
        }
        if (frappe.meta.has_field(frm.doc.accounting_dimension, 'company')) {
          filters['company'] = frm.doc.company
        }
        frm.set_query('dimension_value', 'dimensions', function () {
          return {
            filters: filters,
          }
        })
      })
    }
  },
  accounting_dimension: function (frm?: any) {
    frm.clear_table('dimensions')
    const row = frm.add_child('dimensions')
    row.accounting_dimension = frm.doc.accounting_dimension
    frm.fields_dict['dimensions'].grid.update_docfield_property(
      'dimension_value',
      'label',
      frm.doc.accounting_dimension,
    )
    frm.refresh_field('dimensions')
    frm.trigger('setup_filters')
  },
  apply_restriction_on_values: function (frm?: any) {
    if (!frm.doc.apply_restriction_on_values) {
      frm.set_value('allow_or_restrict', 'Restrict')
      frm.clear_table('dimensions')
      frm.refresh_field('dimensions')
    }
  },
})
frappe.ui.form.on('Allowed Dimension', {
  dimensions_add: function (frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    row.accounting_dimension = frm.doc.accounting_dimension
    frm.refresh_field('dimensions')
  },
})
