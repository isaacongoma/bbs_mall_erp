import { $, __, frappe } from '@/shared/frappe'
frappe.provide('frappe.treeview_settings')
frappe.treeview_settings['Task'] = {
  get_tree_nodes: 'erpnext.projects.doctype.task.task.get_children',
  add_tree_node: 'erpnext.projects.doctype.task.task.add_node',
  filters: [
    {
      fieldname: 'project',
      fieldtype: 'Link',
      options: 'Project',
      label: __('Project'),
    },
    {
      fieldname: 'task',
      fieldtype: 'Link',
      options: 'Task',
      label: __('Task'),
      get_query: function () {
        const me = frappe.treeview_settings['Task']
        const project = me.page.fields_dict.project.get_value()
        const args: any = [['Task', 'is_group', '=', 1]]
        if (project) {
          args.push(['Task', 'project', '=', project])
        }
        return {
          filters: args,
        }
      },
    },
  ],
  breadcrumb: 'Projects',
  get_tree_root: false,
  root_label: 'All Tasks',
  ignore_fields: ['parent_task'],
  onload: function (me?: any) {
    frappe.treeview_settings['Task'].page = {}
    $.extend(frappe.treeview_settings['Task'].page, me.page)
    me.make_tree()
  },
  toolbar: [
    {
      label: __('Add Multiple'),
      icon: 'list-plus',
      condition: function (node?: any) {
        return node.expandable
      },
      click: function (this: any, node?: any) {
        this.data = []
        const dialog = new frappe.ui.Dialog({
          title: __('Add Multiple Tasks'),
          fields: [
            {
              fieldname: 'multiple_tasks',
              fieldtype: 'Table',
              in_place_edit: true,
              data: this.data,
              get_data: () => {
                return this.data
              },
              fields: [
                {
                  fieldtype: 'Data',
                  fieldname: 'subject',
                  in_list_view: 1,
                  reqd: 1,
                  label: __('Subject'),
                },
              ],
            },
          ],
          primary_action: function () {
            dialog.hide()
            return frappe.call({
              method: 'erpnext.projects.doctype.task.task.add_multiple_tasks',
              args: {
                data: dialog.get_values()['multiple_tasks'],
                parent: node.data.value,
              },
            })
          },
          primary_action_label: __('Create'),
        })
        dialog.show()
      },
    },
  ],
  extend_toolbar: true,
}
