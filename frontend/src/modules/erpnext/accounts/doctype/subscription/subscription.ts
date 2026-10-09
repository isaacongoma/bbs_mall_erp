import { $, __, frappe, locals } from '@/shared/frappe'
frappe.ui.form.on('Subscription', {
  setup: function (frm?: any) {
    frm.set_query('party_type', function () {
      return {
        filters: {
          name: ['in', ['Customer', 'Supplier']],
        },
      }
    })
    frm.set_query('cost_center', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
    frm.set_query('sales_tax_template', function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      }
    })
  },
  refresh: function (frm?: any) {
    if (frm.is_new()) {
      frm.get_field('billing_heatmap').$wrapper.empty()
      return
    }
    frm.trigger('render_billing_heatmap')
    if (frm.doc.status !== 'Cancelled') {
      frm.add_custom_button(
        __('Fetch Subscription Updates'),
        () => frm.trigger('get_subscription_updates'),
        __('Actions'),
      )
      frm.add_custom_button(
        __('Force-Fetch Subscription Updates'),
        () => frm.trigger('force_fetch_subscription_updates'),
        __('Actions'),
      )
      frm.add_custom_button(__('Cancel Subscription'), () => frm.trigger('cancel_this_subscription'), __('Actions'))
    } else if (frm.doc.status === 'Cancelled') {
      frm.add_custom_button(__('Restart Subscription'), () => frm.trigger('renew_this_subscription'), __('Actions'))
    }
  },
  cancel_this_subscription: function (frm?: any) {
    frappe.confirm(
      __('This action will stop future billing. Are you sure you want to cancel this subscription?'),
      () => {
        frm.call('cancel_subscription').then((r?: any) => {
          if (!r.exec) {
            frm.reload_doc()
          }
        })
      },
    )
  },
  renew_this_subscription: function (frm?: any) {
    frappe.confirm(__('Are you sure you want to restart this subscription?'), () => {
      frm.call('restart_subscription').then((r?: any) => {
        if (!r.exec) {
          frm.reload_doc()
        }
      })
    })
  },
  get_subscription_updates: function (frm?: any) {
    frm.call('process').then((r?: any) => {
      if (!r.exec) {
        frm.reload_doc()
      }
    })
  },
  force_fetch_subscription_updates: function (frm?: any) {
    frm.call('force_fetch_subscription_updates').then((r?: any) => {
      if (!r.exec) {
        frm.reload_doc()
      }
    })
  },
  render_billing_heatmap: function (frm?: any) {
    frm.call('get_billing_heatmap').then((r?: any) => {
      if (!r.message || !r.message.length) return
      render_heatmap(frm.get_field('billing_heatmap').$wrapper, r.message, frm.doc)
    })
  },
})
frappe.ui.form.on('Subscription Plan Detail', {
  plan: function (frm?: any, cdt?: any, cdn?: any) {
    const row = locals[cdt][cdn]
    if (!row.plan) return
    const requested_plan = row.plan
    frappe.call({
      method: 'erpnext.accounts.doctype.subscription.subscription.get_plan_dimensions',
      args: {
        plan: requested_plan,
        company: frm.doc.company,
        party_type: frm.doc.party_type,
      },
      callback: function (r?: any) {
        if (!r.message || locals[cdt]?.[cdn]?.plan !== requested_plan) return
        for (const [dimension, value] of Object.entries(r.message)) {
          if (frm.fields_dict[dimension] && !frm.doc[dimension]) {
            frm.set_value(dimension, value)
          }
        }
      },
    })
  },
})
const HEATMAP_COLORS: any = {
  Paid: '#39d353',
  Unpaid: '#388bfd',
  Overdue: '#f0883e',
  Cancelled: '#f85149',
  Refunded: '#a371f7',
  Planned: '#87ceeb',
}
const EMPTY_COLOR = '#ebedf0'
function title_case(status?: any) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}
function render_heatmap($wrapper?: any, days?: any, doc?: any) {
  const data_points: any = {}
  days.forEach((day?: any) => {
    data_points[day.date] = title_case(day.status)
  })
  $wrapper.empty()
  const chart_el = $('<div class="subscription-billing-heatmap"></div>').appendTo($wrapper)[0] as HTMLElement
  new frappe.Chart(chart_el, {
    type: 'heatmap',
    data: {
      dataPoints: data_points,
      start: new Date(days[0].date),
      end: new Date(days[days.length - 1].date),
    },
    discreteDomains: 1,
    showLegend: 0,
    colors: ['#ebedf0', '#ebedf0', '#ebedf0', '#ebedf0', '#ebedf0'],
  })
  const within_subscription = (date?: any) =>
    (!doc.start_date || date >= doc.start_date) && (!doc.end_date || date <= doc.end_date)
  const paint = () =>
    chart_el.querySelectorAll('[data-date]').forEach((square?: any) => {
      const status = square.getAttribute('data-value')
      if (status === 'Planned' && !within_subscription(square.getAttribute('data-date'))) {
        square.setAttribute('fill', EMPTY_COLOR)
        square.setAttribute('data-value', '')
        return
      }
      square.setAttribute('fill', HEATMAP_COLORS[status] || EMPTY_COLOR)
    })
  paint()
  new MutationObserver(paint).observe(chart_el, { childList: true, subtree: true })
  const legend = Object.keys(HEATMAP_COLORS)
    .map(
      (status?: any) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;">
					<span style="width:11px;height:11px;border-radius:2px;background:${HEATMAP_COLORS[status]};"></span>
					${__(status)}
				</span>`,
    )
    .join('')
  $(`<div style="margin-top:8px;font-size:11px;color:var(--text-muted);">${legend}</div>`).appendTo($wrapper)
}
