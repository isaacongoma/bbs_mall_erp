import DataTable from 'frappe-datatable'
import { __, frappe } from '@/shared/frappe'
frappe.ui.form.on('System Console', {
  onload: function (frm?: any) {
    frappe.ui.keys.add_shortcut({
      shortcut: 'shift+enter',
      action: () => frm.page.btn_primary.trigger('click'),
      page: frm.page,
      description: __('Execute Console script'),
      ignore_inputs: true,
    })
  },
  refresh: function (frm?: any) {
    frm.disable_save()
    frm.page.set_primary_action(__('Execute'), ($btn?: any) => {
      $btn.text(__('Executing...'))
      return frm
        .execute_action('Execute')
        .then(() => frm.trigger('render_sql_output'))
        .finally(() => $btn.text(__('Execute')))
    })
    if (window.localStorage.getItem('system_console_code') && window.localStorage.getItem('system_console_type')) {
      frm.set_value('type', localStorage.getItem('system_console_type'))
      frm.set_value('console', localStorage.getItem('system_console_code'))
      frm.set_value('output', '')
      window.localStorage.removeItem('system_console_code')
      window.localStorage.removeItem('system_console_type')
    }
    if (!frm.doc.type) {
      frm.set_value('type', 'Python')
    }
    frm.trigger('load_completions')
    frm.page.add_inner_message(`${__('Tip: Try the new dropdown console using')} <kbd>⇧+T</kbd>`)
  },
  type: function (frm?: any) {
    if (frm.doc.type == 'Python') {
      frm.set_value('output', '')
      if (frm.sql_output) {
        frm.sql_output.destroy()
        frm.get_field('sql_output').html('')
      }
    }
    frm.trigger('load_completions')
    const field = frm.get_field('console')
    field.df.options = frm.doc.type
    field.set_language()
  },
  render_sql_output: function (frm?: any) {
    if (frm.doc.type !== 'SQL') return
    if (frm.sql_output) {
      frm.sql_output.destroy()
      frm.get_field('sql_output').html('')
    }
    if (frm.doc.output.startsWith('Traceback')) {
      return
    }
    let result = JSON.parse(frm.doc.output)
    frm.set_value('output', `${result.length} ${result.length == 1 ? 'row' : 'rows'}`)
    if (result.length) {
      let columns = Object.keys(result[0])
      frm.sql_output = new DataTable(frm.get_field('sql_output').$wrapper.get(0), {
        columns,
        data: result,
      })
    }
  },
  show_processlist: function (frm?: any) {
    if (frm.doc.show_processlist) {
      frm.events.refresh_processlist(frm)
      frm.processlist_interval = setInterval(() => frm.events.refresh_processlist(frm), 5000)
    } else {
      if (frm.processlist_interval) {
        clearInterval(frm.processlist_interval)
        frm.get_field('processlist').html('')
      }
    }
  },
  refresh_processlist: function (frm?: any) {
    let timestamp = new Date()
    frappe.call('frappe.desk.doctype.system_console.system_console.show_processlist').then((r?: any) => {
      let rows = ''
      for (let row of r.message) {
        rows += `<tr>
					<td>${row.Id}</td>
					<td>${row.Time}</td>
					<td>${row.State}</td>
					<td>${row.Info}</td>
					<td>${row.Progress}</td>
				</tr>`
      }
      frm.get_field('processlist').html(`
				<p class='text-muted'>Requested on: ${timestamp}</p>
				<table class='table-bordered' style='width: 100%'>
				<thead><tr>
					<th width='5%'>Id</th>
					<th width='10%'>Time</th>
					<th width='10%'>State</th>
					<th width='60%'>Info</th>
					<th width='15%'>Progress / Wait Event</th>
				</tr></thead>
				<tbody>${rows}</thead>`)
    })
  },
  load_completions(frm?: any) {
    if (frm.doc.type != 'Python') {
      frm.set_df_property('console', 'autocompletions', [])
      return
    }
    setTimeout(() => {
      frappe
        .call({
          method: 'frappe.core.doctype.server_script.server_script.get_autocompletion_items',
          type: 'GET',
          cache: true,
        })
        .then((r?: any) => r.message)
        .then((items?: any) => {
          frm.set_df_property('console', 'autocompletions', items)
        })
    }, 100)
  },
})
