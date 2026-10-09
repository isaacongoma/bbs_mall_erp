import { $, __, cint, frappe, open_url_post } from '@/shared/frappe'
frappe.ui.form.on('Bank Statement Import', {
  onload(frm?: any) {
    frm.set_query('bank_account', function (doc?: any) {
      return {
        filters: {
          company: doc.company,
          is_company_account: 1,
        },
      }
    })
  },
  setup(frm?: any) {
    frappe.realtime.on('data_import_refresh', ({ data_import }: any) => {
      frm.import_in_progress = false
      if (data_import !== frm.doc.name) return
      frappe.model.clear_doc('Bank Statement Import', frm.doc.name)
      frappe.model.with_doc('Bank Statement Import', frm.doc.name).then(() => {
        frm.refresh()
      })
    })
    frappe.realtime.on('data_import_progress', (data?: any) => {
      frm.import_in_progress = true
      if (data.data_import !== frm.doc.name) {
        return
      }
      const percent = Math.floor((data.current * 100) / data.total)
      const seconds = Math.floor(data.eta)
      const minutes = Math.floor(data.eta / 60)
      const eta_message =
        seconds < 60
          ? __('About {0} seconds remaining', [seconds])
          : minutes === 1
            ? __('About {0} minute remaining', [minutes])
            : __('About {0} minutes remaining', [minutes])
      let message: any
      if (data.success) {
        const message_args: any = [data.current, data.total, eta_message]
        message =
          frm.doc.import_type === 'Insert New Records'
            ? __('Importing {0} of {1}, {2}', message_args)
            : __('Updating {0} of {1}, {2}', message_args)
      }
      if (data.skipping) {
        message = __('Skipping {0} of {1}, {2}', [data.current, data.total, eta_message])
      }
      frm.dashboard.show_progress(__('Import Progress'), percent, message)
      frm.page.set_indicator(__('In Progress'), 'orange')
      if (data.current === data.total) {
        setTimeout(() => {
          frm.dashboard.hide()
          frm.refresh()
        }, 2000)
      }
    })
    frm.set_query('reference_doctype', () => {
      return {
        filters: {
          name: ['in', frappe.boot.user.can_import],
        },
      }
    })
    frm.get_field('import_file').df.options = {
      restrictions: {
        allowed_file_types: ['.csv', '.xls', '.xlsx', '.TXT', '.txt'],
      },
    }
    frm.has_import_file = () => {
      return frm.doc.import_file || frm.doc.google_sheets_url
    }
  },
  refresh(frm?: any) {
    frm.page.hide_icon_group()
    frm.trigger('toggle_mt940_note')
    frm.trigger('update_indicators')
    frm.trigger('import_file')
    frm.trigger('show_import_log')
    frm.trigger('show_import_warnings')
    frm.trigger('toggle_submit_after_import')
    frm.trigger('show_import_status')
    frm.trigger('show_report_error_button')
    if (frm.doc.status === 'Partial Success') {
      frm.add_custom_button(__('Export Errored Rows'), () => frm.trigger('export_errored_rows'))
    }
    if (frm.doc.status.includes('Success')) {
      frm.add_custom_button(__('Go to {0} List', [__(frm.doc.reference_doctype)]), () =>
        frappe.set_route('List', frm.doc.reference_doctype),
      )
    }
  },
  onload_post_render(frm?: any) {
    frm.trigger('update_primary_action')
  },
  update_primary_action(frm?: any) {
    if (frm.is_dirty()) {
      frm.enable_save()
      return
    }
    frm.disable_save()
    if (frm.doc.status !== 'Success') {
      if (!frm.is_new() && frm.has_import_file()) {
        const label = frm.doc.status === 'Pending' ? __('Start Import') : __('Retry')
        frm.page.set_primary_action(label, () => frm.events.start_import(frm))
      } else {
        frm.page.set_primary_action(__('Save'), () => frm.save())
      }
    }
  },
  update_indicators(frm?: any) {
    const indicator = frappe.get_indicator(frm.doc)
    if (indicator) {
      frm.page.set_indicator(indicator[0], indicator[1])
    } else {
      frm.page.clear_indicator()
    }
  },
  show_import_status(frm?: any) {
    if (frm.doc.status == 'Pending') return
    frappe.call({
      method: 'erpnext.accounts.doctype.bank_statement_import.bank_statement_import.get_import_status',
      args: {
        docname: frm.doc.name,
      },
      callback: function (r?: any) {
        const successful_records = cint(r.message.success)
        const failed_records = cint(r.message.failed)
        const total_records = cint(r.message.total_records)
        if (!total_records) {
          return
        }
        let message: any
        if (failed_records === 0) {
          const message_args: any = [successful_records]
          if (frm.doc.import_type === 'Insert New Records') {
            message =
              successful_records > 1
                ? __('Successfully imported {0} records.', message_args)
                : __('Successfully imported {0} record.', message_args)
          } else {
            message =
              successful_records > 1
                ? __('Successfully updated {0} records.', message_args)
                : __('Successfully updated {0} record.', message_args)
          }
        } else {
          const message_args: any = [successful_records, total_records]
          if (frm.doc.import_type === 'Insert New Records') {
            message =
              successful_records > 1
                ? __(
                    'Successfully imported {0} records out of {1}. Click on Export Errored Rows, fix the errors and import again.',
                    message_args,
                  )
                : __(
                    'Successfully imported {0} record out of {1}. Click on Export Errored Rows, fix the errors and import again.',
                    message_args,
                  )
          } else {
            message =
              successful_records > 1
                ? __(
                    'Successfully updated {0} records out of {1}. Click on Export Errored Rows, fix the errors and import again.',
                    message_args,
                  )
                : __(
                    'Successfully updated {0} record out of {1}. Click on Export Errored Rows, fix the errors and import again.',
                    message_args,
                  )
          }
        }
        frm.dashboard.set_headline(message)
      },
    })
  },
  import_mt940_fromat(frm?: any) {
    frm.trigger('toggle_mt940_note')
    frm.save()
  },
  toggle_mt940_note(frm?: any) {
    if (!frm.doc.import_mt940_fromat) {
      frm.set_df_property('custom_delimiters', 'hidden', 0)
      frm.set_df_property('google_sheets_url', 'hidden', 0)
      frm.set_df_property('html_5', 'hidden', 0)
    } else {
      frm.set_df_property('custom_delimiters', 'hidden', 1)
      frm.set_df_property('google_sheets_url', 'hidden', 1)
      frm.set_df_property('html_5', 'hidden', 1)
    }
    frm.set_value('import_mt940_fromat', frm.doc.import_mt940_fromat)
  },
  show_report_error_button(frm?: any) {
    if (frm.doc.status === 'Error') {
      frappe.db
        .get_list('Error Log', {
          filters: { method: frm.doc.name },
          fields: ['method', 'error'],
          order_by: 'creation desc',
          limit: 1,
        })
        .then((result?: any) => {
          if (result.length > 0) {
            frm.add_custom_button(__('Report Error'), () => {
              const fake_xhr: any = {
                responseText: JSON.stringify({
                  exc: result[0].error,
                }),
              }
              frappe.request.report_error(fake_xhr, {})
            })
          }
        })
    }
  },
  start_import(frm?: any) {
    frm
      .call({
        method: 'form_start_import',
        args: { data_import: frm.doc.name },
        btn: frm.page.btn_primary,
      })
      .then((r?: any) => {
        if (r.message === true) {
          frm.disable_save()
        }
      })
  },
  download_template() {
    const method = '/api/method/frappe.core.doctype.data_import.data_import.download_template'
    open_url_post(method, {
      doctype: 'Bank Transaction',
      export_records: 'blank_template',
      export_fields: {
        'Bank Transaction': [
          'date',
          'deposit',
          'withdrawal',
          'description',
          'reference_number',
          'bank_account',
          'currency',
        ],
      },
    })
  },
  reference_doctype(frm?: any) {
    frm.trigger('toggle_submit_after_import')
  },
  toggle_submit_after_import(frm?: any) {
    frm.toggle_display('submit_after_import', false)
    const doctype = frm.doc.reference_doctype
    if (doctype) {
      frappe.model.with_doctype(doctype, () => {
        const meta = frappe.get_meta(doctype)
        frm.toggle_display('submit_after_import', meta.is_submittable)
      })
    }
  },
  google_sheets_url(frm?: any) {
    if (!frm.is_dirty()) {
      frm.trigger('import_file')
    } else {
      frm.trigger('update_primary_action')
    }
  },
  refresh_google_sheet(frm?: any) {
    frm.trigger('import_file')
  },
  import_file(frm?: any) {
    frm.toggle_display('section_import_preview', frm.has_import_file())
    if (!frm.has_import_file()) {
      frm.get_field('import_preview').$wrapper.empty()
      return
    } else {
      frm.trigger('update_primary_action')
    }
    frm.get_field('import_preview').$wrapper.empty()
    $('<span class="text-muted">').html(__('Loading import file...')).appendTo(frm.get_field('import_preview').$wrapper)
    frappe.run_serially([
      () => {
        if (frm.doc.import_file && frm.doc.import_file.toLowerCase().endsWith('.txt')) {
          return frm
            .call({
              method: 'convert_mt940_to_csv',
              args: {
                data_import: frm.doc.name,
                mt940_file_path: frm.doc.import_file,
              },
            })
            .then((r?: any) => {
              const file_url = r.message
              frm.set_value('import_file', file_url)
              frm.save()
            })
        }
      },
      () => {
        frm
          .call({
            method: 'get_preview_from_template',
            args: {
              data_import: frm.doc.name,
              import_file: frm.doc.import_file,
              google_sheets_url: frm.doc.google_sheets_url,
            },
            error_handlers: {
              TimestampMismatchError() {},
            },
          })
          .then((r?: any) => {
            const preview_data = r.message
            frm.events.show_import_preview(frm, preview_data)
            frm.events.show_import_warnings(frm, preview_data)
          })
      },
    ])
  },
  show_import_preview(frm?: any, preview_data?: any) {
    const import_log = preview_data.import_log
    if (frm.import_preview && frm.import_preview.doctype === frm.doc.reference_doctype) {
      frm.import_preview.preview_data = preview_data
      frm.import_preview.import_log = import_log
      frm.import_preview.refresh()
      return
    }
    frappe.require('data_import_tools.bundle.js', () => {
      frm.import_preview = new frappe.data_import.ImportPreview({
        wrapper: frm.get_field('import_preview').$wrapper,
        doctype: frm.doc.reference_doctype,
        preview_data,
        import_log,
        frm,
        events: {
          remap_column(changed_map?: any) {
            const template_options = JSON.parse(frm.doc.template_options || '{}')
            template_options.column_to_field_map = template_options.column_to_field_map || {}
            Object.assign(template_options.column_to_field_map, changed_map)
            frm.set_value('template_options', JSON.stringify(template_options))
            frm.save().then(() => frm.trigger('import_file'))
          },
        },
      })
    })
  },
  export_errored_rows(frm?: any) {
    open_url_post(
      '/api/method/erpnext.accounts.doctype.bank_statement_import.bank_statement_import.download_errored_template',
      {
        data_import_name: frm.doc.name,
      },
      true,
    )
  },
  export_import_log(frm?: any) {
    open_url_post(
      '/api/method/erpnext.accounts.doctype.bank_statement_import.bank_statement_import.download_import_log',
      {
        data_import_name: frm.doc.name,
      },
    )
  },
  show_import_warnings(frm?: any, preview_data?: any) {
    const columns = preview_data.columns
    let warnings = JSON.parse(frm.doc.template_warnings || '[]')
    warnings = warnings.concat(preview_data.warnings || [])
    frm.toggle_display('import_warnings_section', warnings.length > 0)
    if (warnings.length === 0) {
      frm.get_field('import_warnings').$wrapper.html('')
      return
    }
    const warnings_by_row: any = {}
    const other_warnings: any = []
    for (const warning of warnings) {
      if (warning.row) {
        warnings_by_row[warning.row] = warnings_by_row[warning.row] || []
        warnings_by_row[warning.row].push(warning)
      } else {
        other_warnings.push(warning)
      }
    }
    let html = ''
    html += Object.keys(warnings_by_row)
      .map((row_number?: any) => {
        const message = warnings_by_row[row_number]
          .map((w?: any) => {
            if (w.field) {
              const label = w.field.label + (w.field.parent !== frm.doc.reference_doctype ? ` (${w.field.parent})` : '')
              return `<li>${label}: ${w.message}</li>`
            }
            return `<li>${w.message}</li>`
          })
          .join('')
        return `
				<div class="warning" data-row="${row_number}">
					<h5 class="text-uppercase">${__('Row {0}', [row_number])}</h5>
					<div class="body"><ul>${message}</ul></div>
				</div>
			`
      })
      .join('')
    html += other_warnings
      .map((warning?: any) => {
        let header = ''
        if (warning.col) {
          const column_number = `<span class="text-uppercase">${__('Column {0}', [warning.col])}</span>`
          const column_header = columns[warning.col].header_title
          header = `${column_number} (${column_header})`
        }
        return `
					<div class="warning" data-col="${warning.col}">
						<h5>${header}</h5>
						<div class="body">${warning.message}</div>
					</div>
				`
      })
      .join('')
    frm.get_field('import_warnings').$wrapper.html(`
			<div class="row">
				<div class="col-sm-10 warnings">${html}</div>
			</div>
		`)
  },
  show_failed_logs(frm?: any) {
    frm.trigger('show_import_log')
  },
  render_import_log(frm?: any) {
    frappe.call({
      method: 'erpnext.accounts.doctype.bank_statement_import.bank_statement_import.get_import_logs',
      args: {
        docname: frm.doc.name,
      },
      callback: function (r?: any) {
        const logs = r.message
        if (logs.length === 0) return
        frm.toggle_display('import_log_section', true)
        let rows = logs
          .map((log?: any) => {
            let html = ''
            if (log.success) {
              if (frm.doc.import_type === 'Insert New Records') {
                html = __('Successfully imported {0}', [
                  `<span class="underline">${frappe.utils.get_form_link(frm.doc.reference_doctype, log.docname, true)}<span>`,
                ])
              } else {
                html = __('Successfully updated {0}', [
                  `<span class="underline">${frappe.utils.get_form_link(frm.doc.reference_doctype, log.docname, true)}<span>`,
                ])
              }
            } else {
              const messages = JSON.parse(log.messages || '[]')
                .map((m?: any) => {
                  const title = m.title ? `<strong>${m.title}</strong>` : ''
                  const message = m.message ? `<div>${m.message}</div>` : ''
                  return title + message
                })
                .join('')
              const id = frappe.dom.get_unique_id()
              html = `${messages}
						<button class="btn btn-default btn-xs" type="button" data-toggle="collapse" data-target="#${id}" aria-expanded="false" aria-controls="${id}" style="margin-top: 15px;">
							${__('Show Traceback')}
						</button>
						<div class="collapse" id="${id}" style="margin-top: 15px;">
							<div class="well">
								<pre>${log.exception}</pre>
							</div>
						</div>`
            }
            const indicator_color = log.success ? 'green' : 'red'
            const title = log.success ? __('Success') : __('Failure')
            if (frm.doc.show_failed_logs && log.success) {
              return ''
            }
            return `<tr>
					<td>${JSON.parse(log.row_indexes).join(', ')}</td>
					<td>
						<div class="indicator ${indicator_color}">${title}</div>
					</td>
					<td>
						${html}
					</td>
				</tr>`
          })
          .join('')
        if (!rows && frm.doc.show_failed_logs) {
          rows = `<tr><td class="text-center text-muted" colspan=3>
				${__('No failed logs')}
			</td></tr>`
        }
        frm.get_field('import_log_preview').$wrapper.html(`
			<table class="table table-bordered">
				<tr class="text-muted">
					<th width="10%">${__('Row Number')}</th>
					<th width="10%">${__('Status')}</th>
					<th width="80%">${__('Message')}</th>
				</tr>
				${rows}
			</table>
		`)
      },
    })
  },
  show_import_log(frm?: any) {
    frm.toggle_display('import_log_section', false)
    if (frm.is_new() || frm.import_in_progress) {
      return
    }
    frappe.call({
      method: 'frappe.client.get_count',
      args: {
        doctype: 'Data Import Log',
        filters: {
          data_import: frm.doc.name,
        },
      },
      callback: function (r?: any) {
        const count = r.message
        if (count < 5000) {
          frm.trigger('render_import_log')
        } else {
          frm.toggle_display('import_log_section', false)
          frm.add_custom_button(__('Export Import Log'), () => frm.trigger('export_import_log'))
        }
      },
    })
  },
})
