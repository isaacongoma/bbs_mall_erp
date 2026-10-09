import { $, __, erpnext, format_currency, frappe } from '@/shared/frappe'
frappe.pages['sales-funnel'].on_page_load = function (wrapper?: any) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: __('Sales Funnel'),
    single_column: true,
  })
  $(wrapper).find('.layout-main').addClass('row')
  $(wrapper).find('.layout-main-section-wrapper').addClass('col-md-12')
  wrapper.sales_funnel = new erpnext.SalesFunnel(wrapper)
  frappe.breadcrumbs.add('Selling')
}
erpnext.SalesFunnel = class SalesFunnel {
  [key: string]: any
  constructor(wrapper?: any) {
    let me = this
    setTimeout(function () {
      me.setup(wrapper)
      me.get_data()
    }, 0)
  }
  setup(this: any, wrapper?: any) {
    let me = this
    ;((this.company_field = wrapper.page.add_field({
      fieldtype: 'Link',
      fieldname: 'company',
      options: 'Company',
      label: __('Company'),
      reqd: 1,
      default: frappe.defaults.get_user_default('company'),
      change: function (this: any) {
        me.company = this.value || frappe.defaults.get_user_default('company')
        me.get_data()
      },
    })),
      (this.elements = {
        layout: $(wrapper).find('.layout-main'),
        from_date: wrapper.page.add_date(__('From Date')),
        to_date: wrapper.page.add_date(__('To Date')),
        chart: wrapper.page.add_select(__('Chart'), [
          { value: 'sales_funnel', label: __('Sales Funnel') },
          { value: 'sales_pipeline', label: __('Sales Pipeline') },
          { value: 'opp_by_utm_source', label: __('Opportunities by Source') },
          { value: 'opp_by_utm_campaign', label: __('Opportunities by Campaign') },
          { value: 'opp_by_utm_medium', label: __('Opportunities by Medium') },
        ]),
        refresh_btn: wrapper.page.set_primary_action(
          __('Refresh'),
          function () {
            me.get_data()
          },
          'refresh-cw',
        ),
      }))
    this.elements.no_data = $('<div class="alert alert-warning">' + __('No Data') + '</div>')
      .toggle(false)
      .appendTo(this.elements.layout)
    this.elements.funnel_wrapper = $('<div class="funnel-wrapper text-center"></div>').appendTo(this.elements.layout)
    this.company = frappe.defaults.get_user_default('company')
    this.options = {
      from_date: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
      to_date: frappe.datetime.get_today(),
      chart: 'sales_funnel',
    }
    $.each(this.options, function (k?: any, v?: any) {
      if (['from_date', 'to_date'].includes(k)) {
        me.elements[k].val(frappe.datetime.str_to_user(v))
      } else {
        me.elements[k].val(v)
      }
      me.elements[k].on('change', function (this: any) {
        if (['from_date', 'to_date'].includes(k)) {
          me.options[k] =
            frappe.datetime.user_to_str($(this).val()) != 'Invalid date'
              ? frappe.datetime.user_to_str($(this).val())
              : frappe.datetime.get_today()
        } else {
          me.options.chart = $(this).val()
        }
        me.get_data()
      })
    })
    this.elements.refresh_btn.on('click', function (this: any) {
      me.get_data(this)
    })
    $(window).resize(function () {
      me.render()
    })
  }
  get_data(this: any, btn?: any) {
    let me = this
    if (!this.company) {
      frappe.throw(__('Please select a company.'))
    }
    const method_map: any = {
      sales_funnel: 'erpnext.selling.page.sales_funnel.sales_funnel.get_funnel_data',
      opp_by_utm_source: 'erpnext.selling.page.sales_funnel.sales_funnel.get_opp_by_utm_source',
      opp_by_utm_campaign: 'erpnext.selling.page.sales_funnel.sales_funnel.get_opp_by_utm_campaign',
      opp_by_utm_medium: 'erpnext.selling.page.sales_funnel.sales_funnel.get_opp_by_utm_medium',
      sales_pipeline: 'erpnext.selling.page.sales_funnel.sales_funnel.get_pipeline_data',
    }
    frappe.call({
      method: method_map[this.options.chart],
      args: {
        from_date: this.options.from_date,
        to_date: this.options.to_date,
        company: this.company,
      },
      btn: btn,
      callback: function (r?: any) {
        if (!r.exc) {
          me.options.data = r.message
          if (me.options.data == 'empty') {
            const $parent = me.elements.funnel_wrapper
            $parent.html(__('No data for this period'))
          } else {
            me.render()
          }
        }
      },
    })
  }
  render(this: any) {
    let me = this
    if (me.options.chart == 'sales_funnel') {
      me.render_funnel()
    } else if (me.options.chart == 'opp_by_utm_source') {
      me.render_chart(__('Sales Opportunities by Source'))
    } else if (me.options.chart == 'opp_by_utm_campaign') {
      me.render_chart(__('Sales Opportunities by Campaign'))
    } else if (me.options.chart == 'opp_by_utm_medium') {
      me.render_chart(__('Sales Opportunities by Medium'))
    } else if (me.options.chart == 'sales_pipeline') {
      me.render_chart(__('Sales Pipeline by Stage'))
    }
  }
  render_funnel(this: any) {
    let me = this
    this.prepare_funnel()
    let context = this.elements.context,
      x_start = 0.0,
      x_end = this.options.width,
      x_mid = (x_end - x_start) / 2.0,
      y = 0,
      y_old = 0.0
    if (this.options.total_value === 0) {
      this.elements.no_data.toggle(true)
      return
    }
    this.options.data.forEach(function (d?: any) {
      context.fillStyle = d.color
      context.strokeStyle = d.color
      me.draw_triangle(x_start, x_mid, x_end, y, me.options.height)
      y_old = y
      y = y + d.height
      let half_side = (me.options.height - y) / Math.sqrt(3)
      x_start = x_mid - half_side
      x_end = x_mid + half_side
      let y_mid = y_old + (y - y_old) / 2.0
      me.draw_legend(x_mid, y_mid, me.options.width, me.options.height, d.value + ' - ' + d.title)
    })
  }
  prepare_funnel(this: any) {
    let me = this
    this.elements.no_data.toggle(false)
    this.options.width = ($(this.elements.funnel_wrapper).width() * 2.0) / 3.0
    this.options.height = (Math.sqrt(3) * this.options.width) / 2.0
    const min_height = (this.options.height * 0.1) / this.options.data.length
    const height = this.options.height * 0.9
    this.options.total_weightage = this.options.data.reduce(function (prev?: any, curr?: any, i?: any) {
      return prev + Math.pow(i + 1, 2) * curr.value
    }, 0.0)
    $.each(this.options.data, function (i?: any, d?: any) {
      d.height = (height * d.value * Math.pow(i + 1, 2)) / me.options.total_weightage + min_height
    })
    this.elements.canvas = $('<canvas></canvas>')
      .appendTo(this.elements.funnel_wrapper.empty())
      .attr('width', $(this.elements.funnel_wrapper).width())
      .attr('height', this.options.height)
    this.elements.context = this.elements.canvas.get(0).getContext('2d')
  }
  draw_triangle(this: any, x_start?: any, x_mid?: any, x_end?: any, y?: any, height?: any) {
    let context = this.elements.context
    context.beginPath()
    context.moveTo(x_start, y)
    context.lineTo(x_end, y)
    context.lineTo(x_mid, height)
    context.lineTo(x_start, y)
    context.closePath()
    context.fill()
  }
  draw_legend(this: any, x_mid?: any, y_mid?: any, width?: any, _height?: any, title?: any) {
    let context = this.elements.context
    if (y_mid == 0) {
      y_mid = 7
    }
    context.beginPath()
    context.moveTo(x_mid, y_mid)
    context.lineTo(width, y_mid)
    context.closePath()
    context.stroke()
    context.beginPath()
    context.arc(width, y_mid, 5, 0, Math.PI * 2, false)
    context.closePath()
    context.fill()
    context.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color')
    context.textBaseline = 'middle'
    context.font = '1.1em sans-serif'
    context.fillText(__(title), width + 20, y_mid)
  }
  render_chart(this: any, title?: any) {
    let me = this
    let currency = frappe.defaults.get_default('currency')
    let chart_data = me.options.data ? me.options.data : null
    const parent = me.elements.funnel_wrapper[0]
    this.chart = new frappe.Chart(parent, {
      title: title,
      height: 400,
      data: chart_data,
      type: 'bar',
      barOptions: {
        stacked: 1,
      },
      tooltipOptions: {
        formatTooltipY: (d?: any) => format_currency(d, currency),
      },
    })
  }
}
