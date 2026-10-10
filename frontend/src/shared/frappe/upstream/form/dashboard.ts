import { $, __, cint, frappe, moment } from '@/shared/frappe/runtime'
import Section from './section.js'
frappe.ui.form.Dashboard = class FormDashboard {
  [key: string]: any
  constructor(parent?: any, frm?: any) {
    this.parent = parent
    this.frm = frm
    this.setup_dashboard_sections()
  }
  setup_dashboard_sections(this: any) {
    this.progress_area = this.make_section({
      css_class: 'progress-area',
      hidden: 1,
      collapsible: 1,
      is_dashboard_section: 1,
    })
    this.heatmap_area = this.make_section({
      label: __('Activity'),
      css_class: 'form-heatmap',
      hidden: 1,
      collapsible: 1,
      is_dashboard_section: 1,
      body_html: `
				<div id="heatmap-${frappe.model.scrub(this.frm.doctype)}" class="heatmap"></div>
				<div class="text-muted small heatmap-message hidden"></div>
			`,
    })
    this.chart_area = this.make_section({
      label: __('Graph'),
      css_class: 'form-graph',
      hidden: 1,
      collapsible: 1,
      is_dashboard_section: 1,
    })
    this.stats_area_row = $(`<div class="row"></div>`)
    this.stats_area = this.make_section({
      label: __('Stats'),
      css_class: 'form-stats',
      hidden: 1,
      collapsible: 1,
      is_dashboard_section: 1,
      body_html: this.stats_area_row,
    })
    this.transactions_area = $(`<div class="transactions"></div>`)
    this.links_area = this.make_section({
      label: __('Connections'),
      hide_label: true,
      css_class: 'form-links',
      hidden: 1,
      is_dashboard_section: 1,
      body_html: this.transactions_area,
    })
  }
  make_section(this: any, df?: any) {
    return new Section(this.parent, df)
  }
  reset(this: any) {
    this.progress_area.body.empty()
    this.progress_area.hide()
    this.heatmap_area.hide()
    this.chart_area.hide()
    this.links_area.body.find('.count, .open-notification').addClass('hidden')
    this.links_area.hide()
    this.stats_area_row.empty()
    this.stats_area.hide()
    this.parent.find('.custom').remove()
  }
  add_section(this: any, body_html?: any, label: any = null, css_class: any = 'custom', hidden: any = false) {
    let options: any = {
      label,
      css_class,
      hidden,
      body_html,
      make_card: true,
      collapsible: 1,
      is_dashboard_section: 1,
    }
    return new Section(this.parent, options).body
  }
  add_progress(this: any, title?: any, percent?: any, message?: any) {
    let progress_chart = this.make_progress_chart(title)
    if (!$.isArray(percent)) {
      percent = this.format_percent(title, percent)
    }
    let progress = $('<div class="progress"></div>').appendTo(progress_chart)
    $.each(percent, function (_i?: any, opts?: any) {
      $(
        `<div class="progress-bar ${opts.progress_class}" style="width: ${opts.width}" title="${opts.title}"></div>`,
      ).appendTo(progress)
    })
    if (!message) message = ''
    $(`<p class="progress-message text-muted small">${message}</p>`).appendTo(progress_chart)
    this.show()
    return progress_chart
  }
  show_progress(this: any, title?: any, percent?: any, message?: any) {
    this._progress_map = this._progress_map || {}
    let progress_chart = this._progress_map[title]
    if (!progress_chart || progress_chart.parent().length == 0) {
      progress_chart = this.add_progress(title, percent, message)
      this._progress_map[title] = progress_chart
    }
    if (!$.isArray(percent)) {
      percent = this.format_percent(title, percent)
    }
    progress_chart.find('.progress-bar').each((i?: any, progress_bar?: any) => {
      const { progress_class, width } = percent[i]
      $(progress_bar)
        .css('width', width)
        .removeClass('progress-bar-danger progress-bar-success')
        .addClass(progress_class)
    })
    if (!message) message = ''
    progress_chart.find('.progress-message').text(message)
  }
  hide_progress(this: any, title?: any) {
    if (title) {
      this._progress_map[title].remove()
      delete this._progress_map[title]
    } else {
      this._progress_map = {}
      this.progress_area.hide()
    }
  }
  format_percent(title?: any, percent?: any) {
    const percentage = cint(percent)
    const width = percentage < 0 ? 100 : percentage
    const progress_class = percentage < 0 ? 'progress-bar-danger' : 'progress-bar-success'
    return [
      {
        title: title,
        width: width + '%',
        progress_class: progress_class,
      },
    ]
  }
  make_progress_chart(this: any, title?: any) {
    this.progress_area.show()
    return $('<div class="progress-chart" title="' + (title || '') + '"></div>').appendTo(this.progress_area.body)
  }
  refresh(this: any) {
    this.reset()
    if (this.frm.doc.__islocal || !frappe.boot.desk_settings.dashboard) {
      return
    }
    if (!this.data) {
      this.init_data()
    }
    let show = false
    if (this.data && ((this.data.transactions || []).length || (this.data.reports || []).length)) {
      if (this.data.docstatus && this.frm.doc.docstatus !== this.data.docstatus) {
        return
      }
      this.render_links()
      show = true
    }
    this._fetched_counts = false
    if (this.data.heatmap) {
      this.render_heatmap()
      show = true
    }
    if (this.data.graph) {
      this.setup_graph()
    }
    if (show) {
      this.show()
    }
  }
  after_refresh(this: any) {
    this.links_area.body.find('.btn-new').each((_i?: any, el?: any) => {
      if (this.frm.can_create($(el).attr('data-doctype'))) {
        $(el).removeClass('hidden')
      }
    })
    this.observe_link_render()
  }
  observe_link_render(this: any) {
    let me = this
    let element = this.links_area.wrapper[0]
    new IntersectionObserver((entries?: any, observer?: any) => {
      entries.forEach((entry?: any) => {
        if (entry.intersectionRatio > 0) {
          me.set_open_count()
          observer.disconnect()
        }
      })
    }).observe(element)
  }
  init_data(this: any) {
    this.data = this.frm.meta.__dashboard || {}
    if (!this.data.transactions) this.data.transactions = []
    if (!this.data.internal_links) this.data.internal_links = {}
    if (!this.data.internal_and_external_links) this.data.internal_and_external_links = {}
    this.filter_permissions()
  }
  add_transactions(this: any, opts?: any) {
    let group_added: any = []
    if (!Array.isArray(opts)) opts = [opts]
    if (!this.data) {
      this.init_data()
    }
    if (this.data && (this.data.transactions || []).length) {
      this.data.transactions.map((group?: any) => {
        opts.map((d?: any) => {
          if (d.label == group.label) {
            group_added.push(d.label)
            group.items.push(...d.items)
            if (d.fieldnames) {
              if (!group.fieldnames) {
                group.fieldnames = {}
              }
              Object.assign(group.fieldnames, d.fieldnames)
            }
          }
        })
      })
      opts.map((d?: any) => {
        if (!group_added.includes(d.label)) {
          this.data.transactions.push(d)
        }
      })
      this.filter_permissions()
    }
  }
  filter_permissions(this: any) {
    let transactions: any = []
    ;(this.data.transactions || []).forEach(function (group?: any) {
      let items: any = []
      group.items.forEach(function (doctype?: any) {
        if (frappe.model.can_read(doctype)) {
          items.push(doctype)
        }
      })
      if (items.length) {
        group.items = items
        transactions.push(group)
      }
    })
    this.data.transactions = transactions
  }
  render_links(this: any) {
    let me = this
    this.links_area.show()
    this.links_area.body.find('.btn-new').addClass('hidden')
    if (this.data_rendered) {
      return
    }
    this.data.frm = this.frm
    let transactions_area_body = this.transactions_area
    $(frappe.render_template('form_links', this.data)).appendTo(transactions_area_body)
    this.render_report_links()
    transactions_area_body.find('.badge-link').on('click', function (this: any) {
      me.open_document_list($(this).closest('.document-link'))
    })
    transactions_area_body.find('.open-notification').on('click', function (this: any) {
      me.open_document_list($(this).parent(), true)
    })
    transactions_area_body.find('.btn-new').on('click', function (this: any) {
      const doctype = $(this).attr('data-doctype')
      const fieldname = $(this).attr('data-fieldname')
      me.frm.make_new(doctype, fieldname)
    })
    this.data_rendered = true
  }
  render_report_links(this: any) {
    let parent = this.transactions_area
    if (this.data.reports && this.data.reports.length) {
      $(frappe.render_template('report_links', this.data)).appendTo(parent)
      parent.find('.report-link').on('click', (e?: any) => {
        this.open_report($(e.target).parent())
      })
    }
  }
  open_report(this: any, $link?: any) {
    let report = $link.attr('data-report')
    let fieldname = this.data.non_standard_fieldnames
      ? this.data.non_standard_fieldnames[report] || this.data.fieldname
      : this.data.fieldname
    frappe.provide('frappe.route_options')
    frappe.route_options[fieldname] = this.frm.doc.name
    frappe.set_route('query-report', report)
  }
  open_document_list(this: any, $link?: any, show_open?: any) {
    let doctype = $link.attr('data-doctype'),
      names = $link.attr('data-names') || []
    const fieldname =
      $link.find('.document-link-badge').attr('data-fieldname') ||
      (this.data.non_standard_fieldnames && this.data.non_standard_fieldnames[doctype]) ||
      this.data.fieldname
    if (names.length) {
      frappe.route_options = { name: ['in', names] }
    } else if (this.internal_links_found && this.internal_links_found.find((d?: any) => d.doctype === doctype)) {
      return false
    } else if (fieldname) {
      frappe.route_options = this.get_document_filter(doctype, fieldname)
      if (show_open && frappe.ui.notifications) {
        frappe.ui.notifications.show_open_count_list(doctype)
      }
    }
    frappe.set_route('List', doctype, 'List')
  }
  get_document_filter(this: any, _doctype?: any, fieldname?: any) {
    const filter: any = {}
    if (this.data.dynamic_links && this.data.dynamic_links[fieldname]) {
      let dynamic_fieldname = this.data.dynamic_links[fieldname][1]
      filter[dynamic_fieldname] = this.data.dynamic_links[fieldname][0]
    }
    filter[fieldname] = this.frm.doc.name
    return filter
  }
  set_open_count(this: any) {
    if (!this.data || !this.data.transactions || !this.data.fieldname || this.frm.is_new() || this._fetched_counts) {
      return
    }
    let items: any = [],
      me = this
    this.data.transactions.forEach(function (group?: any) {
      group.items.forEach(function (item?: any) {
        items.push(item)
      })
    })
    let method = this.data.method || 'frappe.desk.notifications.get_open_count'
    frappe.call({
      type: 'GET',
      method: method,
      args: {
        doctype: this.frm.doctype,
        name: this.frm.docname,
        items: items,
      },
      callback: function (r?: any) {
        if (r.message.timeline_data) {
          me.update_heatmap(r.message.timeline_data)
        }
        me.update_badges(r.message.count)
        me.frm.dashboard_data = r.message
        me._fetched_counts = true
        me.frm.trigger('dashboard_update')
      },
    })
  }
  update_badges(this: any, count?: any) {
    let me = this
    this.internal_links_found = count.internal_links_found
    $.each(count.internal_links_found, function (_i?: any, d?: any) {
      me.frm.dashboard.set_badge_count_for_internal_link(d.doctype, d.open_count, d.count, d.names)
    })
    $.each(count.external_links_found, function (_i?: any, d?: any) {
      me.frm.dashboard.set_badge_count_for_external_link(d.doctype, d.open_count, d.count, d.names)
    })
  }
  set_badge_count_for_external_link(this: any, doctype?: any, open_count?: any, count?: any, names?: any) {
    let $link = $(this.transactions_area).find('.document-link[data-doctype="' + doctype + '"]')
    this.set_badge_count_common(open_count, count, $link)
    $link.attr('data-names', names ? names.join(',') : '')
  }
  set_badge_count_for_internal_link(this: any, doctype?: any, open_count?: any, count?: any, names?: any) {
    let $link = $(this.transactions_area).find('.document-link[data-doctype="' + doctype + '"]')
    this.set_badge_count_common(open_count, count, $link)
    if (names && names.length) {
      $link.attr('data-names', names ? names.join(',') : '')
    } else {
      $link.find('a').attr('disabled', true)
    }
  }
  set_badge_count_common(open_count?: any, count?: any, $link?: any) {
    if (open_count) {
      $link
        .find('.open-notification')
        .removeClass('hidden')
        .html(cint(open_count) > 99 ? '99+' : open_count)
    }
    if (count) {
      $link
        .find('.count')
        .removeClass('hidden')
        .text(cint(count) > 99 ? '99+' : count)
        .attr(
          'title',
          count != '?'
            ? __('Count of linked documents')
            : __('Accurate count can not be fetched, click here to view all documents'),
        )
    }
  }
  update_heatmap(this: any, data?: any) {
    if (this.heatmap) {
      this.heatmap.update({ dataPoints: data })
    }
  }
  render_heatmap(this: any) {
    this.heatmap = new frappe.Chart(this.heatmap_area.body.find('.heatmap')[0], {
      type: 'heatmap',
      start: new Date(moment().subtract(1, 'year').toDate()),
      count_label: 'interactions',
      discreteDomains: 1,
      radius: 3,
      data: {},
    })
    this.heatmap_area.show()
    this.heatmap_area.body.find('svg').css({ margin: 'auto' })
    let heatmap_message = this.heatmap_area.body.find('.heatmap-message')
    if (this.data.heatmap_message) {
      heatmap_message.removeClass('hidden').html(this.data.heatmap_message)
    } else {
      heatmap_message.addClass('hidden')
    }
  }
  add_indicator(this: any, label?: any, color?: any) {
    this.show()
    this.stats_area.show()
    let indicators = this.stats_area_row.find('.indicator-column')
    let n_indicators = indicators.length + 1
    let colspan: any
    if (n_indicators > 4) {
      colspan = 3
    } else {
      colspan = 12 / n_indicators
    }
    if (indicators.length) {
      indicators
        .removeClass()
        .addClass('col-sm-' + colspan)
        .addClass('indicator-column')
    }
    return $(
      '<div class="col-sm-' +
        colspan +
        ' indicator-column"><span class="indicator ' +
        color +
        '">' +
        label +
        '</span></div>',
    ).appendTo(this.stats_area_row)
  }
  setup_graph(this: any) {
    let me = this
    let method = this.data.graph_method
    let args: any = {
      doctype: this.frm.doctype,
      docname: this.frm.doc.name,
    }
    $.extend(args, this.data.graph_method_args)
    frappe.call({
      type: 'GET',
      method: method,
      args: args,
      callback: function (r?: any) {
        if (r.message) {
          me.render_graph(r.message)
          me.show()
        } else {
          me.hide()
        }
      },
    })
  }
  render_graph(this: any, args?: any) {
    this.chart_area.show()
    this.chart_area.body.empty()
    $.extend(args, {
      type: args.type || 'line',
      colors: args.colors || ['green'],
      truncateLegends: 1,
      axisOptions: {
        shortenYAxisNumbers: 1,
        numberFormatter: frappe.utils.format_chart_axis_number,
      },
    })
    this.show()
    this.chart = new frappe.Chart('.form-graph', args)
    if (!this.chart) {
      this.hide()
    }
  }
  show(this: any) {
    this.toggle_visibility(true)
  }
  hide(this: any) {
    this.toggle_visibility(false)
  }
  toggle_visibility(this: any, show?: any) {
    this.parent.toggleClass('visible-section', show)
    this.parent.toggleClass('empty-section', !show)
  }
  set_headline(this: any, html?: any, color?: any, permanent: any = false) {
    return this.frm.layout.show_message(html, color, permanent)
  }
  clear_headline(this: any) {
    this.frm.layout.show_message()
  }
  add_comment(this: any, text?: any, alert_class?: any, permanent?: any) {
    this.set_headline_alert(text, alert_class, permanent)
    if (!permanent) {
      setTimeout(() => {
        this.clear_headline()
      }, 10000)
    }
  }
  clear_comment(this: any) {
    this.clear_headline()
  }
  set_headline_alert(this: any, text?: any, color?: any, permanent: any = false) {
    if (text) {
      return this.set_headline(`<div>${text}</div>`, color, permanent)
    } else {
      this.clear_headline()
    }
  }
}
