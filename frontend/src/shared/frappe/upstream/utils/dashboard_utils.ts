import { $, __, frappe } from '@/shared/frappe/runtime'
frappe.dashboard_utils = {
  render_chart_filters: function (filters?: any, button_class?: any, container?: any, append?: any) {
    filters.forEach((filter?: any) => {
      let icon_html = '',
        filter_class = ''
      if (filter.icon) {
        icon_html = frappe.utils.icon(filter.icon)
      }
      if (filter.class) {
        filter_class = filter.class
      }
      let chart_filter_html = `<div class="${button_class} ${filter_class} btn-group dropdown pull-right">
					<a data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
						<button class="btn btn-secondary btn-xs">
							${icon_html}
							<span class="filter-label">${__(filter.label)}</span>
							${frappe.utils.icon('chevrons-up-down', 'xs')}
						</button>
				</a>`
      let options_html: any
      if (filter.fieldnames) {
        options_html = filter.options
          .map(
            (option?: any, i?: any) => `<li>
						<a class="dropdown-item" data-fieldname="${filter.fieldnames[i]}" data-option="${encodeURIComponent(option)}">${__(option)}</a>
					</li>`,
          )
          .join('')
      } else {
        options_html = filter.options
          .map(
            (option?: any) =>
              `<li><a class="dropdown-item" data-option="${encodeURIComponent(option)}">${__(option)}</a></li>`,
          )
          .join('')
      }
      let dropdown_html = chart_filter_html + `<ul class="dropdown-menu">${options_html}</ul></div>`
      let $chart_filter = $(dropdown_html)
      if (append) {
        $chart_filter.prependTo(container)
      } else $chart_filter.appendTo(container)
      $chart_filter.find('.dropdown-menu').on('click', 'li a', (e?: any) => {
        let $el = $(e.currentTarget)
        let fieldname: any
        if ($el.attr('data-fieldname')) {
          fieldname = $el.attr('data-fieldname')
        }
        let selected_item = decodeURIComponent($el.data('option'))
        $el.parents(`.${button_class}`).find('.filter-label').html(__(selected_item))
        filter.action(selected_item, fieldname)
      })
    })
  },
  get_filters_for_chart_type: function (chart?: any) {
    if (chart.chart_type === 'Custom' && chart.source) {
      const method = 'frappe.desk.doctype.dashboard_chart_source.dashboard_chart_source.get_config'
      return frappe.xcall(method, { name: chart.source }).then((config?: any) => {
        frappe.dom.eval(config)
        return frappe.dashboards.chart_sources[chart.source].filters
      })
    } else if (chart.chart_type === 'Report' && chart.report_name) {
      return frappe.report_utils.get_report_filters(chart.report_name).then((filters?: any) => {
        return filters
      })
    } else {
      return Promise.resolve()
    }
  },
  get_dashboard_settings(this: any) {
    return frappe.db
      .get_list('Dashboard Settings', {
        filters: {
          name: frappe.session.user,
        },
        fields: ['*'],
      })
      .then((settings?: any) => {
        if (!settings.length) {
          return this.create_dashboard_settings().then((settings?: any) => {
            return settings
          })
        } else {
          return settings[0]
        }
      })
  },
  create_dashboard_settings() {
    return frappe
      .xcall('frappe.desk.doctype.dashboard_settings.dashboard_settings.create_dashboard_settings', {
        user: frappe.session.user,
      })
      .then((settings?: any) => {
        return settings
      })
  },
  get_years_since_creation(this: any, creation?: any) {
    let creation_year = this.get_year(creation)
    let current_year = this.get_year(frappe.datetime.now_date())
    let years_list: any = []
    for (let year = current_year; year >= creation_year; year--) {
      years_list.push(year)
    }
    return years_list
  },
  get_year(date_str?: any) {
    return date_str.substring(0, date_str.indexOf('-'))
  },
  remove_common_static_filter_values(static_filters?: any, dynamic_filters?: any) {
    if (dynamic_filters) {
      if (Array.isArray(static_filters)) {
        static_filters = static_filters.filter((static_filter?: any) => {
          for (let dynamic_filter of dynamic_filters) {
            if (static_filter[0] == dynamic_filter[0] && static_filter[1] == dynamic_filter[1]) {
              return false
            }
          }
          return true
        })
      } else {
        for (let key of Object.keys(dynamic_filters)) {
          delete static_filters[key]
        }
      }
    }
    return static_filters
  },
  get_fields_for_dynamic_filter_dialog(is_document_type?: any, filters?: any, dynamic_filters?: any) {
    let fields: any = [
      {
        fieldtype: 'HTML',
        fieldname: 'description',
        options: `<div>
						<p>${__('Set dynamic filter values in JavaScript for the required fields here.')}
						</p>
						<p>${__('For example:')}
							<code>frappe.defaults.get_user_default("Company")</code>
						</p>
					</div>`,
      },
    ]
    if (is_document_type) {
      if (dynamic_filters) {
        filters = [...filters, ...dynamic_filters]
      }
      filters.forEach((f?: any) => {
        for (let field of fields) {
          if (field.fieldname == f[0] + ':' + f[1]) {
            return
          }
        }
        if (f[2] == '=') {
          fields.push({
            label: `${f[1]} (${f[0]})`,
            fieldname: f[0] + ':' + f[1],
            fieldtype: 'Data',
          })
        }
      })
    } else {
      filters = { ...dynamic_filters, ...filters }
      for (let key of Object.keys(filters)) {
        fields.push({
          label: key,
          fieldname: key,
          fieldtype: 'Data',
        })
      }
    }
    return fields
  },
  get_all_filters(doc?: any) {
    let filters = doc.filters_json ? JSON.parse(doc.filters_json) : null
    let dynamic_filters = doc.dynamic_filters_json ? JSON.parse(doc.dynamic_filters_json) : null
    const has_dynamic_filters = Array.isArray(dynamic_filters)
      ? dynamic_filters.length
      : dynamic_filters && Object.keys(dynamic_filters).length
    if (!has_dynamic_filters) {
      return filters
    }
    if (!Array.isArray(dynamic_filters)) {
      Object.keys(dynamic_filters).forEach((key?: any) => {
        try {
          dynamic_filters[key] = eval(dynamic_filters[key])
        } catch (e: any) {
          frappe.throw(__('Invalid expression set in filter {0}', [key]))
        }
      })
      return filters ? Object.assign(filters, dynamic_filters) : dynamic_filters
    }
    dynamic_filters.forEach((f?: any) => {
      try {
        f[3] = eval(f[3])
      } catch (e: any) {
        frappe.throw(__('Invalid expression set in filter {0} ({1})', [f[1], f[0]]))
      }
    })
    if (!filters) {
      filters = dynamic_filters
    } else if (Array.isArray(filters)) {
      filters = [...filters, ...dynamic_filters]
    } else {
      dynamic_filters.forEach((f?: any) => {
        filters[f[1]] = f[3]
      })
    }
    return filters
  },
  get_dashboard_link_field() {
    let field: any = {
      label: __('Select Dashboard'),
      fieldtype: 'Link',
      fieldname: 'dashboard',
      options: 'Dashboard',
    }
    if (!frappe.boot.developer_mode) {
      field.get_query = () => {
        return {
          filters: {
            is_standard: 0,
          },
        }
      }
    }
    return field
  },
  get_add_to_dashboard_dialog(this: any, docname?: any, doctype?: any, method?: any) {
    const field = this.get_dashboard_link_field()
    const dialog = new frappe.ui.Dialog({
      title: __('Add to Dashboard'),
      fields: [field],
      primary_action: (values?: any) => {
        values.name = docname
        values.set_standard = frappe.boot.developer_mode
        return frappe.xcall(method, { args: values }).then(() => {
          let dashboard_route_html = `<a href = "/desk/dashboard/${values.dashboard}">${values.dashboard}</a>`
          let message = __('{0} {1} added to Dashboard {2}', [doctype, values.name, dashboard_route_html])
          frappe.msgprint(message)
          dialog.hide()
        })
      },
    })
    return dialog
  },
}
