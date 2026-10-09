import { __, erpnext, frappe } from '@/shared/frappe'
frappe.treeview_settings['Cost Center'] = {
  breadcrumb: 'Accounts',
  get_tree_root: false,
  filters: [
    {
      fieldname: 'company',
      fieldtype: 'Select',
      options: erpnext.utils.get_tree_options('company'),
      label: __('Company'),
      default: erpnext.utils.get_tree_default('company'),
    },
  ],
  root_label: 'Cost Centers',
  get_tree_nodes: 'erpnext.accounts.utils.get_children',
  get_label: function (node?: any) {
    return frappe.utils.escape_html(node.data.cost_center_name || node.title || node.label)
  },
  onrender: function (node?: any) {
    if (node.is_root || !node.data) return
    const flags: any = []
    if (node.data.cost_center_number) {
      flags.push(frappe.ui.badge({ label: node.data.cost_center_number }))
    }
    erpnext.utils.render_tree_node_flags(node, flags)
  },
  add_tree_node: 'erpnext.accounts.utils.add_cc',
  menu_items: [
    {
      label: __('New Company'),
      action: function () {
        frappe.new_doc('Company', true)
      },
      condition: 'frappe.boot.user.can_create.indexOf("Company") !== -1',
    },
  ],
  fields: [
    { fieldtype: 'Data', fieldname: 'cost_center_name', label: __('New Cost Center Name'), reqd: true },
    {
      fieldtype: 'Check',
      fieldname: 'is_group',
      label: __('Is Group'),
      description: __('Further cost centers can be made under Groups but entries can be made against non-Groups'),
    },
    {
      fieldtype: 'Data',
      fieldname: 'cost_center_number',
      label: __('Cost Center Number'),
      description: __('Number of new Cost Center, it will be included in the cost center name as a prefix'),
    },
  ],
  ignore_fields: ['parent_cost_center'],
  toolbar: [
    {
      label: __('Convert to Group'),
      icon: 'folder-tree',
      condition: function (node?: any) {
        return !node.is_root && !node.expandable && frappe.model.can_write('Cost Center')
      },
      click: function (node?: any) {
        erpnext.accounts.convert_tree_node('Cost Center', node, 'convert_ledger_to_group')
      },
    },
    {
      label: __('Convert to Non-Group'),
      icon: 'file-text',
      condition: function (node?: any) {
        return (
          !node.is_root &&
          node.expandable &&
          node.loaded &&
          !node.$ul.children().length &&
          frappe.model.can_write('Cost Center')
        )
      },
      click: function (node?: any) {
        erpnext.accounts.convert_tree_node('Cost Center', node, 'convert_group_to_ledger')
      },
    },
  ],
  extend_toolbar: true,
  onload: function (treeview?: any) {
    function get_company() {
      return treeview.page.fields_dict.company.get_value()
    }
    treeview.page.add_inner_button(
      __('Chart of Accounts'),
      function () {
        frappe.set_route('Tree', 'Account', { company: get_company() })
      },
      __('View'),
    )
    treeview.page.add_inner_button(
      __('Budget List'),
      function () {
        frappe.set_route('List', 'Budget', { company: get_company() })
      },
      __('Budget'),
    )
    treeview.page.add_inner_button(
      __('Monthly Distribution'),
      function () {
        frappe.set_route('List', 'Monthly Distribution', { company: get_company() })
      },
      __('Budget'),
    )
    treeview.page.add_inner_button(
      __('Budget Variance Report'),
      function () {
        frappe.set_route('query-report', 'Budget Variance Report', { company: get_company() })
      },
      __('Budget'),
    )
  },
}
frappe.provide('erpnext.accounts')
erpnext.accounts.convert_tree_node =
  erpnext.accounts.convert_tree_node ||
  function (doctype?: any, node?: any, method?: any) {
    frappe.call({
      method: 'run_doc_method',
      args: { dt: doctype, dn: node.label, method: method },
      callback: function (r?: any) {
        if (r.exc) return
        const treeview = frappe.views.trees[doctype]
        node.parent_node && treeview.tree.load_children(node.parent_node)
        frappe.show_alert({ message: __('{0} converted', [node.label]), indicator: 'green' })
      },
    })
  }
