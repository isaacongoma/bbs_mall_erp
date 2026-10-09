import { $, __, frappe } from '@/shared/frappe/runtime'

frappe.RoleEditor = class {
  [key: string]: any
  constructor(wrapper: any, frm: any, disable: any = false, options: any = {}) {
    if (disable && typeof disable === 'object') {
      options = disable
      disable = false
    }
    const { table_fieldname = 'roles', role_fieldname = 'role', child_doctype } = options
    const configured_child_doctype = frappe.meta.get_docfield(frm.doctype, table_fieldname)?.options
    this.frm = frm
    this.wrapper = wrapper
    this.disable = Boolean(disable)
    this.table_fieldname = table_fieldname
    this.role_fieldname = role_fieldname
    this.child_doctype = child_doctype || configured_child_doctype || 'Has Role'
    let user_roles = this.get_selected_roles()
    this.multicheck = frappe.ui.form.make_control({
      parent: wrapper,
      df: {
        fieldname: this.table_fieldname,
        fieldtype: 'MultiCheck',
        select_all: true,
        columns: '15rem',
        get_data: () => {
          return frappe.xcall('frappe.core.doctype.user.user.get_all_roles').then((roles: any) => {
            return roles.map((role: any) => {
              return {
                label: __(role),
                value: role,
                checked: user_roles.includes(role),
              }
            })
          })
        },
        on_change: () => {
          this.set_roles_in_table()
          this.frm.dirty()
        },
      },
      render_input: true,
    })
    let original_func = this.multicheck.make_checkboxes
    this.multicheck.make_checkboxes = () => {
      original_func.call(this.multicheck)
      this.multicheck.$wrapper.find('.label-area').click((e: any) => {
        let role = $(e.target).data('unit')
        role && this.show_permissions(role)
        e.preventDefault()
      })
      this.set_enable_disable()
    }
  }
  set_enable_disable(this: any) {
    $(this.wrapper)
      .find('input[type="checkbox"]')
      .attr('disabled', this.disable ? true : false)
    $(this.wrapper)
      .find('button')
      .attr('disabled', this.disable ? true : false)
  }
  show_permissions(this: any, role: any) {
    if (!this.perm_dialog) {
      this.make_perm_dialog()
    }
    $(this.perm_dialog.body).empty()
    let is_dark = document.documentElement.getAttribute('data-theme') === 'dark'
    let header_bg_color = is_dark ? 'bg-dark text-white' : 'bg-light'
    return frappe.xcall('frappe.core.doctype.user.user.get_perm_info', { role }).then((permissions: any) => {
      const $body = $(this.perm_dialog.body)
      if (!permissions.length) {
        $body.append(`<div class="text-muted text-center padding">
						${__('{0} role does not have permission on any doctype', [__(role)])}
					</div>`)
      } else {
        const rights: any = [
          ...frappe.perm.rights,
          ...new Set(permissions.flatMap((perm: any) => frappe.boot?.doctype_ptype_map?.[perm.parent] || [])),
        ]
        $body.append(`
						<div style="max-height:calc(100vh - 200px); overflow-y:auto;">
							<table class="user-perm">
								<thead>
									<tr>
										<th class="sticky-top ${header_bg_color}"> ${__('Document Type')} </th>
										<th class="sticky-top ${header_bg_color}"> ${__('Level')} </th>
										<th class="sticky-top ${header_bg_color}"> ${__('If Owner')} </th>
										${rights.map((p: any) => `<th class="sticky-top ${header_bg_color}">${__(frappe.unscrub(p))}</th>`).join('')}
									</tr>
								</thead>
								<tbody></tbody>
							</table>
						</div>
					`)
        permissions.forEach((perm: any) => {
          $body.find('tbody').append(`
							<tr>
								<td>${__(perm.parent)}</td>
								<td>${perm.permlevel}</td>
								<td>${perm.if_owner ? frappe.utils.icon('check', 'xs') : '-'}</td>
								${rights
                  .map(
                    (p: any) => `<td class="text-muted bold">${perm[p] ? frappe.utils.icon('check', 'xs') : '-'}</td>`,
                  )
                  .join('')}
							</tr>
						`)
        })
      }
      this.perm_dialog.set_title(__(role))
      this.perm_dialog.show()
    })
  }
  make_perm_dialog(this: any) {
    this.perm_dialog = new frappe.ui.Dialog({
      title: __('Role Permissions'),
    })
    this.perm_dialog.$wrapper.find('.modal-dialog').css('width', 'auto').css('max-width', '1200px')
    this.perm_dialog.$wrapper.find('.modal-body').css('overflow', 'overlay')
  }
  show(this: any) {
    this.reset()
    this.set_enable_disable()
  }
  reset(this: any) {
    let user_roles = this.get_selected_roles()
    this.multicheck.selected_options = user_roles
    this.multicheck.refresh_input()
  }
  set_roles_in_table(this: any) {
    let roles = this.get_role_rows()
    let checked_options = this.multicheck.get_checked_options()
    roles.forEach((role_doc: any) => {
      if (!checked_options.includes(this.get_role_value(role_doc))) {
        frappe.model.clear_doc(role_doc.doctype, role_doc.name)
      }
    })
    checked_options.forEach((role: any) => {
      if (!roles.find((d: any) => this.get_role_value(d) === role)) {
        let role_doc = frappe.model.add_child(this.frm.doc, this.child_doctype, this.table_fieldname)
        this.set_role_value(role_doc, role)
      }
    })
  }
  get_role_rows(this: any) {
    return this.frm.doc[this.table_fieldname] || []
  }
  get_selected_roles(this: any) {
    return this.get_role_rows().map((row: any) => this.get_role_value(row))
  }
  get_role_value(this: any, row: any) {
    return row[this.role_fieldname]
  }
  set_role_value(this: any, row: any, role: any) {
    row[this.role_fieldname] = role
  }
  get_roles(this: any) {
    return {
      checked_roles: this.multicheck.get_checked_options(),
      unchecked_roles: this.multicheck.get_unchecked_options(),
    }
  }
}
