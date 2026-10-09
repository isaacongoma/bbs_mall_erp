import { __, frappe } from '@/shared/frappe'
frappe.listview_settings['Task'] = {
  add_fields: [
    'project',
    'status',
    'priority',
    'exp_start_date',
    'exp_end_date',
    'subject',
    'progress',
    'depends_on_tasks',
  ],
  filters: [['status', '=', 'Open']],
  onload: function (listview?: any) {
    const method = 'erpnext.projects.doctype.task.task.set_multiple_status'
    listview.page.add_menu_item(__('Set as Open'), function () {
      listview.call_for_selected_items(method, { status: 'Open' })
    })
    listview.page.add_menu_item(__('Set as Completed'), function () {
      listview.call_for_selected_items(method, { status: 'Completed' })
    })
  },
  get_indicator: function (doc?: any) {
    const colors: any = {
      Open: 'orange',
      Overdue: 'red',
      'Pending Review': 'orange',
      Working: 'orange',
      Completed: 'green',
      Cancelled: 'dark grey',
      Template: 'blue',
    }
    return [__(doc.status), colors[doc.status], 'status,=,' + doc.status]
  },
  gantt_custom_popup_html: function (ganttobj?: any, task?: any) {
    let html = `
			<a class="mb-2 inline-block cursor-pointer"
				href="/app/task/${ganttobj.id}">
				${ganttobj.name}
			</a>
		`
    if (task.project) {
      html += `<p class="mb-1">${__('Project')}:
				<a class="inline-block"
					href="/app/project/${task.project}">
					${task.project}
				</a>
			</p>`
    }
    html += `<p class="mb-1">
			${__('Progress')}:
			<span>${ganttobj.progress}%</span>
		</p>`
    if (task._assign) {
      const assign_list = JSON.parse(task._assign)
      const assignment_wrapper = `
				<span>Assigned to:</span>
				<span>
					${assign_list.map((user?: any) => frappe.user_info(user).fullname).join(', ')}
				</span>
			`
      html += assignment_wrapper
    }
    return `<div class="p-3" style="min-width: 220px">${html}</div>`
  },
}
