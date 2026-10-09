import { $, __, frappe, open_url_post } from '@/shared/frappe'
frappe.ui.form.on('Chart of Accounts Importer', {
  onload: function (frm?: any) {
    frm.set_value('company', '')
    frm.set_value('import_file', '')
  },
  refresh: function (frm?: any) {
    frm.disable_save()
    frm.set_df_property('company', 'reqd', frm.doc.company ? 0 : 1)
    frm.set_df_property('import_file_section', 'hidden', frm.doc.company ? 0 : 1)
    if (frm.doc.import_file) {
      frappe.run_serially([
        () => generate_tree_preview(frm),
        () => create_import_button(frm),
        () => frm.set_df_property('chart_preview', 'hidden', 0),
        () => frm.fields_dict.chart_preview.collapse(false),
      ])
    }
    frm.set_df_property('chart_preview', 'hidden', $(frm.fields_dict['chart_tree'].wrapper).html() != '' ? 0 : 1)
  },
  download_template: function (frm?: any) {
    const d = new frappe.ui.Dialog({
      title: __('Download Template'),
      fields: [
        {
          label: 'File Type',
          fieldname: 'file_type',
          fieldtype: 'Select',
          reqd: 1,
          options: ['Excel', 'CSV'],
        },
        {
          label: 'Template Type',
          fieldname: 'template_type',
          fieldtype: 'Select',
          reqd: 1,
          options: ['Sample Template', 'Blank Template'],
          change: () => {
            const template_type = d.get_value('template_type')
            if (template_type === 'Sample Template') {
              d.set_df_property(
                'template_type',
                'description',
                `The Sample Template contains all the required accounts pre filled in the  template.
								You can add more accounts or change existing accounts in the template as per your choice.`,
              )
            } else {
              d.set_df_property(
                'template_type',
                'description',
                `The Blank Template contains just the account type and root type required to build the Chart
								of Accounts. Please enter the account names and add more rows as per your requirement.`,
              )
            }
          },
        },
        {
          label: 'Company',
          fieldname: 'company',
          fieldtype: 'Link',
          reqd: 1,
          hidden: 1,
          default: frm.doc.company,
        },
      ],
      primary_action: function () {
        const data = d.get_values()
        if (!data.template_type) {
          frappe.throw(__('Please select <b>Template Type</b> to download template'))
        }
        open_url_post(
          '/api/method/erpnext.accounts.doctype.chart_of_accounts_importer.chart_of_accounts_importer.download_template',
          {
            file_type: data.file_type,
            template_type: data.template_type,
            company: data.company,
          },
        )
        d.hide()
      },
      primary_action_label: __('Download'),
    })
    d.show()
  },
  import_file: function (frm?: any) {
    if (!frm.doc.import_file) {
      frm.page.set_indicator('')
      $(frm.fields_dict['chart_tree'].wrapper).empty()
    }
  },
  company: function (frm?: any) {
    if (frm.doc.company) {
      frappe.call({
        method: 'erpnext.accounts.doctype.chart_of_accounts_importer.chart_of_accounts_importer.validate_company',
        args: {
          company: frm.doc.company,
        },
      })
    }
  },
})
const create_import_button = function (frm?: any) {
  frm.page
    .set_primary_action(__('Import'), function () {
      return frappe.call({
        method: 'erpnext.accounts.doctype.chart_of_accounts_importer.chart_of_accounts_importer.import_coa',
        args: {
          file_name: frm.doc.import_file,
          company: frm.doc.company,
        },
        freeze: true,
        freeze_message: __('Creating Accounts...'),
        callback: function (r?: any) {
          if (!r.exc) {
            frm.page.set_indicator(__('Import Successful'), 'blue')
            create_reset_button(frm)
          }
        },
      })
    })
    .addClass('btn btn-primary')
}
const create_reset_button = function (frm?: any) {
  frm.page
    .set_primary_action(__('Reset'), function () {
      frm.page.clear_primary_action()
      frm.reload_doc()
    })
    .addClass('btn btn-primary')
}
const generate_tree_preview = function (frm?: any) {
  let $expand_all: any, $collapse_all: any
  const parent = __('All Accounts')
  const wrapper = $(frm.fields_dict['chart_tree'].wrapper).empty()
  const has_row_helpers =
    typeof frappe.ui.Tree.prototype.get_expansion_state === 'function' &&
    typeof frappe.ui.Tree.prototype.filter_nodes === 'function'
  let tree: any
  let deep_loaded = false
  let search_text = ''
  let update_buttons = () => {}
  if (has_row_helpers) {
    const $toolbar = $('<div class="flex items-center gap-2 mb-2"></div>').appendTo(wrapper)
    const search_control = frappe.ui.form.make_control({
      df: { fieldtype: 'Data', fieldname: 'preview_search', placeholder: __('Search') },
      parent: $toolbar,
      only_input: true,
    })
    search_control.refresh()
    $(search_control.wrapper).addClass('m-0').css('width', '220px')
    search_control.$input.addClass('input-xs')
    search_control.$input.on(
      'input',
      frappe.utils.debounce(() => {
        search_text = search_control.$input.val()
        const run = () => {
          if (search_text !== search_control.$input.val()) return
          tree.filter_nodes(search_text)
        }
        if (!search_text || deep_loaded) {
          run()
          return
        }
        tree.load_children(tree.root_node, true).then(() => {
          deep_loaded = true
          run()
        })
      }, 300),
    )
    const $actions = $('<div class="ms-auto flex items-center gap-1"></div>').appendTo($toolbar)
    update_buttons = () => {
      const state = tree.get_expansion_state()
      $expand_all.prop('disabled', !(state === 'collapsed' || state === 'partial'))
      $collapse_all.prop('disabled', !(state === 'expanded' || state === 'partial'))
    }
    const make_action = (icon?: any, label?: any, onclick?: any) => {
      const $btn = $(frappe.ui.button({ icon, disabled: true, onclick, attrs: { 'aria-label': label } }))
      const $wrapper = $('<span class="inline-flex"></span>').append($btn).appendTo($actions)
      frappe.ui.tooltip($wrapper, { text: label })
      return $btn
    }
    $expand_all = make_action('chevrons-up-down', __('Expand All'), () => {
      tree.load_children(tree.root_node, true).then(() => {
        deep_loaded = true
      })
    })
    $collapse_all = make_action('chevrons-down-up', __('Collapse All'), () => {
      tree.load_children(tree.root_node, false)
    })
  }
  tree = new frappe.ui.Tree({
    parent: wrapper,
    label: parent,
    expandable: true,
    row_style: true,
    method: 'erpnext.accounts.doctype.chart_of_accounts_importer.chart_of_accounts_importer.get_coa',
    args: {
      file_name: frm.doc.import_file,
      parent: parent,
      doctype: 'Chart of Accounts Importer',
      file_type: frm.doc.file_type,
    },
    on_node_render: () => update_buttons(),
    on_click: () => setTimeout(update_buttons, 0),
  })
  return tree
}
