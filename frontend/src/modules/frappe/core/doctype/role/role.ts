import { __, cint, frappe } from '@/shared/frappe'
const { PERM_FLAGS, ALL_PERM_FLAGS, capitalize } = frappe.perm_editor
frappe.ui.form.on('Role', {
  refresh(frm?: any) {
    frm.role_form = new RoleForm(frm)
    frm.role_form.render()
  },
  on_tab_change(frm?: any) {
    frm.role_form && frm.role_form.load_active_tab()
  },
})
class RoleForm {
  [key: string]: any
  constructor(frm?: any) {
    this.frm = frm
  }
  get role() {
    return this.frm.doc.name
  }
  render(this: any) {
    this.show_banner()
    this.frm.set_df_property('is_custom', 'read_only', frappe.session.user !== 'Administrator')
    this.add_buttons()
    this.setup_tabs()
  }
  setup_tabs(this: any) {
    this.tabs = {
      users_tab: new UsersTab(this.frm),
      document_tab: new DocumentsTab(this.frm),
      report_tab: new ReportsTab(this.frm),
      pages_tab: new PagesTab(this.frm),
      workspace_tab: new WorkspacesTab(this.frm),
    }
    frappe
      .require('embedded_list.bundle.js')
      .then(() => {
        Object.values(this.tabs).forEach((tab?: any) => tab.build())
        const profiles = new RoleProfilesTab(this.frm)
        profiles.build()
        profiles.refresh()
        this.load_active_tab()
      })
      .catch((e?: any) => {
        console.error('Role form: failed to load embedded_list.bundle.js', e)
        frappe.ui.toast({
          message: __('Could not load this section. Please refresh the page.'),
          type: 'error',
        })
      })
  }
  load_active_tab(this: any) {
    const active = this.frm.get_active_tab && this.frm.get_active_tab()
    const fieldname = active && active.df && active.df.fieldname
    const tab = fieldname && this.tabs && this.tabs[fieldname]
    if (tab) tab.refresh()
  }
  show_banner(this: any) {
    const messages: any = {
      All: __("Role 'All' will be given to all system + website users."),
      'Desk User': __("Role 'Desk User' will be given to all system users."),
    }
    if (messages[this.role]) this.frm.dashboard.add_comment(messages[this.role], 'yellow')
  }
  add_buttons(this: any) {
    this.frm.add_custom_button(
      __('Role Permissions Manager'),
      () => {
        frappe.route_options = { role: this.role }
        frappe.set_route('permission-manager')
      },
      __('View'),
    )
    if (frappe.user.has_role('System Manager')) {
      this.frm.add_custom_button(__('Replicate Role'), () => new ReplicateRoleDialog(this.frm).show(), __('Action'))
    }
  }
}
class RoleTab {
  [key: string]: any
  constructor(frm?: any, html_fieldname?: any) {
    this.frm = frm
    this.html_fieldname = html_fieldname
  }
  get role() {
    return this.frm.doc.name
  }
  get wrapper() {
    const field = this.frm.fields_dict[this.html_fieldname]
    return field ? field.$wrapper : null
  }
  build(this: any) {
    const wrapper = this.wrapper && this.wrapper.empty()
    if (!wrapper) return
    if (this.frm.is_new()) {
      wrapper.html(placeholder_html(__('Save the role first to view this information.')))
      return
    }
    this.list = new frappe.ui.EmbeddedList(Object.assign({ wrapper, show_index: true }, this.list_config()))
  }
  refresh(this: any) {
    this.list && this.list.refresh()
  }
  list_config() {
    return {}
  }
  save_roles_on_doc(doctype?: any, name?: any, transform?: any) {
    return frappe.db.get_doc(doctype, name).then((doc?: any) => {
      doc.roles = transform(doc.roles || [])
      return client_save(doc)
    })
  }
}
class RoleProfilesTab extends RoleTab {
  [key: string]: any
  constructor(frm?: any) {
    super(frm, 'role_profiles_html')
  }
  override list_config(this: any) {
    return {
      description: __('Role Profiles that include this role.'),
      empty_message: __('No Role Profiles include this role.'),
      columns: [
        {
          label: __('Role Profile'),
          fieldname: 'name',
          type: 'link',
          route: (row?: any) => ['Form', 'Role Profile', row.name],
        },
      ],
      get_data: () => this.get_data(),
    }
  }
  get_data(this: any) {
    return frappe.db
      .get_list('Has Role', {
        filters: { role: this.role, parenttype: 'Role Profile' },
        fields: ['parent'],
        limit: 0,
        parent_doctype: 'Role Profile',
      })
      .then((rows?: any) => unique_parents(rows).map((parent?: any) => ({ name: parent })))
  }
}
class UsersTab extends RoleTab {
  [key: string]: any
  constructor(frm?: any) {
    super(frm, 'users_html')
  }
  override list_config(this: any) {
    return {
      description: __('Users who have this role.'),
      empty_message: __('No users have this role.'),
      add_button: { label: __('Add User'), action: () => this.add() },
      columns: [
        {
          label: __('Full Name'),
          fieldname: 'full_name',
          type: 'link',
          text: (row?: any) => row.full_name || row.name,
          route: (row?: any) => ['Form', 'User', row.name],
        },
        { label: __('Email'), fieldname: 'email' },
        {
          type: 'actions',
          actions: [
            {
              label: __('Remove'),
              icon: 'x',
              danger: true,
              action: (row?: any, refresh?: any) => this.remove_user(row, refresh),
            },
          ],
        },
      ],
      get_data: () => this.get_data(),
    }
  }
  get_data(this: any) {
    return frappe.db
      .get_list('Has Role', {
        filters: { role: this.role, parenttype: 'User' },
        fields: ['parent'],
        limit: 0,
        parent_doctype: 'User',
      })
      .then((rows?: any) => this.fetch_users(unique_parents(rows)))
  }
  fetch_users(names?: any) {
    if (!names.length) return []
    return frappe.db.get_list('User', {
      filters: { name: ['in', names], enabled: 1 },
      fields: ['name', 'full_name', 'email'],
      order_by: 'full_name asc',
      limit: 0,
    })
  }
  add(this: any) {
    const existing = unique_values(this.list.data, 'name')
    const dialog = new frappe.ui.Dialog({
      title: __('Add User to {0}', [this.role]),
      fields: [
        {
          label: __('User'),
          fieldname: 'user',
          fieldtype: 'Link',
          options: 'User',
          reqd: 1,
          get_query: () => ({
            filters: { enabled: 1, name: ['not in', not_in(existing)] },
          }),
        },
      ],
      primary_action_label: __('Add'),
      primary_action: (values?: any) => this.add_existing_user(values.user, dialog),
    })
    dialog.fields_dict.user.new_doc = () => {
      dialog.hide()
      this.create_new_user()
    }
    dialog.show()
  }
  add_existing_user(this: any, user_name?: any, dialog?: any) {
    this.get_user_role_profiles(user_name).then((profiles?: any) => {
      if (profiles.length) return this.notify_profile_managed(user_name, profiles)
      this.add_role(user_name)
        .then(() => {
          dialog.hide()
          frappe.show_alert({ message: __('User added.'), indicator: 'green' })
          this.refresh()
        })
        .catch((e?: any) => {
          frappe.show_alert({
            message: e.message || __('Failed to add user.'),
            indicator: 'red',
          })
        })
    })
  }
  create_new_user(this: any) {
    this.eligible_role_profiles().then((eligible?: any) => {
      const dialog = new frappe.ui.Dialog({
        title: __('Create New User'),
        fields: [
          { label: __('Email'), fieldname: 'email', fieldtype: 'Data', reqd: 1 },
          {
            label: __('First Name'),
            fieldname: 'first_name',
            fieldtype: 'Data',
            reqd: 1,
          },
          {
            label: __('Role Profile'),
            fieldname: 'role_profile',
            fieldtype: 'Link',
            options: 'Role Profile',
            description: __('Leave empty to grant {0} directly.', [this.role]),
            get_query: () => ({
              filters: { name: ['in', eligible.length ? eligible : ['']] },
            }),
          },
        ],
        primary_action_label: __('Create'),
        primary_action: (values?: any) => this.insert_user(values, dialog),
      })
      dialog.add_custom_action(__('Edit Full Form'), () => this.edit_full_form(dialog))
      dialog.show()
    })
  }
  insert_user(this: any, values?: any, dialog?: any) {
    const doc: any = { doctype: 'User', email: values.email, first_name: values.first_name }
    if (values.role_profile) doc.role_profiles = [{ role_profile: values.role_profile }]
    else doc.roles = [{ role: this.role }]
    frappe.db
      .insert(doc)
      .then(() => {
        dialog.hide()
        frappe.show_alert({ message: __('User created.'), indicator: 'green' })
        this.refresh()
      })
      .catch((e?: any) => {
        frappe.show_alert({
          message: e.message || __('Failed to create user.'),
          indicator: 'red',
        })
      })
  }
  edit_full_form(this: any, dialog?: any) {
    const values = dialog.get_values(true) || {}
    const doc = frappe.model.get_new_doc('User')
    doc.email = values.email
    doc.first_name = values.first_name
    if (values.role_profile) {
      frappe.model.add_child(doc, 'User Role Profile', 'role_profiles').role_profile = values.role_profile
    } else {
      frappe.model.add_child(doc, 'Has Role', 'roles').role = this.role
    }
    dialog.hide()
    frappe.set_route('Form', 'User', doc.name)
  }
  notify_profile_managed(user_name?: any, profiles?: any) {
    frappe.msgprint({
      title: __('Role Managed by Role Profile'),
      message: __("{0}'s roles come from the Role Profile {1}. Edit that to change this.", [
        frappe.utils.escape_html(user_name),
        frappe.utils.comma_and(profiles.map((p?: any) => frappe.utils.escape_html(p))),
      ]),
      indicator: 'orange',
    })
  }
  eligible_role_profiles(this: any) {
    return frappe.db
      .get_list('Has Role', {
        filters: { role: this.role, parenttype: 'Role Profile' },
        fields: ['parent'],
        limit: 0,
        parent_doctype: 'Role Profile',
      })
      .then((rows?: any) => unique_parents(rows))
  }
  get_user_role_profiles(user_name?: any) {
    return frappe.db
      .get_list('User Role Profile', {
        filters: { parenttype: 'User', parent: user_name },
        fields: ['role_profile'],
        limit: 0,
        parent_doctype: 'User',
      })
      .then((rows?: any) => rows.map((r?: any) => r.role_profile))
  }
  add_role(this: any, user_name?: any) {
    return this.save_roles_on_doc('User', user_name, (roles?: any) => {
      if (!roles.find((r?: any) => r.role === this.role)) roles.push({ role: this.role })
      return roles
    })
  }
  remove_user(this: any, row?: any, refresh?: any) {
    this.get_user_role_profiles(row.name).then((profiles?: any) => {
      if (profiles.length) return this.notify_profile_managed(row.name, profiles)
      frappe.confirm(__('Remove {0} from this role?', [row.full_name || row.name]), () =>
        this.remove(row.name).then(refresh),
      )
    })
  }
  remove(this: any, user_name?: any) {
    return this.save_roles_on_doc('User', user_name, (roles?: any) => roles.filter((r?: any) => r.role !== this.role))
  }
}
class DocumentsTab extends RoleTab {
  [key: string]: any
  constructor(frm?: any) {
    super(frm, 'document_permissions_html')
  }
  override list_config(this: any) {
    return {
      page_size: 50,
      description: __('DocTypes this role can access.'),
      empty_message: __('No documents added.'),
      empty_icon: 'file-text',
      no_match_message: __('No documents found.'),
      add_button: { label: __('Add Permission'), action: () => this.add() },
      columns: this.columns(),
      on_row_click: (row?: any) => this.edit(row),
      get_data: () => this.get_data(),
    }
  }
  get_data(this: any) {
    return frappe
      .call({
        method: 'frappe.core.page.permission_manager.permission_manager.get_permissions',
        args: { role: this.role },
      })
      .then((r?: any) => this.transform(r.message || []))
  }
  transform(perms?: any) {
    return perms
      .map((perm?: any) => ({ ...perm, source: perm.parenttype ? 'Standard' : 'Custom' }))
      .sort((a?: any, b?: any) => a.parent.localeCompare(b.parent) || (a.permlevel || 0) - (b.permlevel || 0))
  }
  columns() {
    const cols: any = [
      { label: __('DocType'), fieldname: 'parent' },
      {
        label: __('Type'),
        fieldname: 'source',
        type: 'badge',
        color: (row?: any) => (row.source === 'Custom' ? 'blue' : 'gray'),
      },
      { label: __('Permission Level'), fieldname: 'permlevel', align: 'center' },
      {
        label: __('Only if Creator'),
        fieldname: 'if_owner',
        type: 'check',
        align: 'center',
      },
    ]
    PERM_FLAGS.forEach((flag?: any) =>
      cols.push({
        label: __(capitalize(flag)),
        fieldname: flag,
        type: 'check',
        align: 'center',
      }),
    )
    return cols
  }
  edit(this: any, row?: any) {
    new frappe.ui.PermissionDialog(this, { row }).show()
  }
  add(this: any) {
    new frappe.ui.PermissionDialog(this, {}).show()
  }
  create(this: any, values?: any) {
    const doctype = values.ref_doctype
    const permlevel = cint(values.permlevel)
    return frappe
      .call({
        method: 'frappe.core.page.permission_manager.permission_manager.add',
        args: { parent: doctype, role: this.role, permlevel },
      })
      .then(() =>
        frappe.db.get_list('Custom DocPerm', {
          filters: { parent: doctype, role: this.role, permlevel, if_owner: 0 },
          fields: ['name'],
          order_by: 'creation desc',
          limit: 1,
        }),
      )
      .then((rows?: any) => {
        const name = rows && rows[0] && rows[0].name
        return name ? frappe.db.set_value('Custom DocPerm', name, this.perm_data(values)) : null
      })
  }
  update(this: any, row?: any, values?: any) {
    const data = this.perm_data(values)
    if (row.source === 'Custom') {
      return frappe.db.set_value('Custom DocPerm', row.name, data)
    }
    return frappe
      .call({
        method: 'frappe.core.page.permission_manager.permission_manager.update',
        args: {
          doctype: row.parent,
          role: this.role,
          permlevel: row.permlevel,
          ptype: 'read',
          value: data.read,
          if_owner: row.if_owner || 0,
        },
      })
      .then(() =>
        frappe.db.get_value(
          'Custom DocPerm',
          {
            parent: row.parent,
            role: this.role,
            permlevel: row.permlevel,
            if_owner: row.if_owner || 0,
          },
          'name',
        ),
      )
      .then((r?: any) => {
        const name = r.message && r.message.name
        if (!name) frappe.throw(__('Permission row not found after conversion. Please refresh.'))
        return frappe.db.set_value('Custom DocPerm', name, data)
      })
  }
  remove(this: any, row?: any) {
    return frappe.call({
      method: 'frappe.core.page.permission_manager.permission_manager.remove',
      args: {
        doctype: row.parent,
        role: this.role,
        permlevel: row.permlevel,
        if_owner: row.if_owner || 0,
      },
    })
  }
  perm_data(values?: any) {
    const data: any = {}
    ;['if_owner', ...ALL_PERM_FLAGS].forEach((flag?: any) => (data[flag] = values[flag] ? 1 : 0))
    return data
  }
}
class RoleAccessTab extends RoleTab {
  [key: string]: any
  get_data(this: any) {
    return frappe.db
      .get_list('Has Role', {
        filters: { role: this.role, parenttype: this.access_doctype },
        fields: ['parent'],
        limit: 0,
        parent_doctype: this.access_doctype,
      })
      .then((rows?: any) => {
        const names = unique_parents(rows)
        return this.fetch_records(names)
      })
  }
  fetch_records(this: any, names?: any) {
    if (!names.length) return []
    return frappe.db.get_list(this.access_doctype, {
      filters: { name: ['in', names] },
      fields: this.meta_fields,
      order_by: 'name asc',
      limit: 0,
    })
  }
  name_link_column(this: any) {
    return {
      label: __(this.label),
      fieldname: 'name',
      type: 'link',
      route: (row?: any) => ['Form', this.access_doctype, row.name],
    }
  }
  remove_action_column(this: any) {
    return {
      type: 'actions',
      actions: [
        {
          label: __('Remove'),
          icon: 'x',
          danger: true,
          confirm: __("Remove this role's access to {0}?"),
          confirm_field: 'name',
          action: (row?: any, refresh?: any) => this.remove(row.name).then(refresh),
        },
      ],
    }
  }
  add(this: any) {
    const existing = unique_values(this.list.data, 'name')
    const dialog = new frappe.ui.Dialog({
      title: __('Add {0} Access to {1}', [__(this.label), this.role]),
      fields: [
        {
          label: __(this.label),
          fieldname: 'doc',
          fieldtype: 'Link',
          options: this.access_doctype,
          reqd: 1,
          get_query: () => ({ filters: { name: ['not in', not_in(existing)] } }),
        },
      ],
      primary_action_label: __('Add'),
      primary_action: (values?: any) => {
        this.add_role(values.doc)
          .then(() => {
            dialog.hide()
            frappe.show_alert({ message: __('Access added.'), indicator: 'green' })
            this.refresh()
          })
          .catch((e?: any) => {
            frappe.show_alert({
              message: e.message || __('Failed to add access.'),
              indicator: 'red',
            })
          })
      },
    })
    dialog.show()
  }
  add_role(this: any, record_name?: any) {
    return this.save_roles_on_doc(this.access_doctype, record_name, (roles?: any) => {
      if (!roles.find((r?: any) => r.role === this.role)) roles.push({ role: this.role })
      return roles
    })
  }
  remove(this: any, record_name?: any) {
    return this.save_roles_on_doc(this.access_doctype, record_name, (roles?: any) =>
      roles.filter((r?: any) => r.role !== this.role),
    )
  }
}
class ReportsTab extends RoleAccessTab {
  [key: string]: any
  constructor(frm?: any) {
    super(frm, 'report_roles_html')
    this.access_doctype = 'Report'
    this.label = 'Report'
    this.meta_fields = ['name', 'module', 'report_type', 'ref_doctype']
  }
  report_route(row?: any) {
    if (row.report_type === 'Report Builder') {
      return ['List', row.ref_doctype, 'Report', row.name]
    }
    return ['query-report', row.name]
  }
  override list_config(this: any) {
    return {
      description: __('Reports this role can access.'),
      empty_message: __('This role does not have access to any reports.'),
      empty_icon: 'sheet',
      no_match_message: __('No reports found.'),
      add_button: { label: __('Add Report'), action: () => this.add() },
      columns: [
        {
          label: __('Report'),
          fieldname: 'name',
          type: 'link',
          route: (row?: any) => this.report_route(row),
        },
        { label: __('Module'), fieldname: 'module' },
        this.remove_action_column(),
      ],
      get_data: () => this.get_data(),
    }
  }
}
class PagesTab extends RoleAccessTab {
  [key: string]: any
  constructor(frm?: any) {
    super(frm, 'page_roles_html')
    this.access_doctype = 'Page'
    this.label = 'Page'
    this.meta_fields = ['name', 'title', 'module']
  }
  override list_config(this: any) {
    return {
      description: __('Pages this role can access.'),
      empty_message: __('This role does not have access to any pages.'),
      empty_icon: 'file',
      no_match_message: __('No pages found.'),
      add_button: { label: __('Add Page'), action: () => this.add() },
      columns: [
        {
          label: __('Title'),
          fieldname: 'title',
          type: 'link',
          text: (row?: any) => row.title || row.name,
          route: (row?: any) => ['Form', 'Page', row.name],
        },
        { label: __('Module'), fieldname: 'module' },
        this.remove_action_column(),
      ],
      get_data: () => this.get_data(),
    }
  }
}
class WorkspacesTab extends RoleAccessTab {
  [key: string]: any
  constructor(frm?: any) {
    super(frm, 'workspace_roles_html')
    this.access_doctype = 'Workspace'
    this.label = 'Workspace'
    this.meta_fields = ['name', 'title', 'module']
  }
  override list_config(this: any) {
    return {
      description: __('Workspaces this role can access.'),
      empty_message: __('This role does not have access to any workspaces.'),
      empty_icon: 'table-2',
      no_match_message: __('No workspaces found.'),
      add_button: { label: __('Add Workspace'), action: () => this.add() },
      columns: [
        {
          label: __('Workspace'),
          fieldname: 'title',
          type: 'link',
          text: (row?: any) => row.title || row.name,
          route: (row?: any) => [frappe.router.slug(row.name)],
        },
        { label: __('Module'), fieldname: 'module' },
        this.remove_action_column(),
      ],
      get_data: () => this.get_data(),
    }
  }
}
class ReplicateRoleDialog {
  [key: string]: any
  constructor(frm?: any) {
    this.frm = frm
  }
  show(this: any) {
    this.dialog = new frappe.ui.Dialog({
      title: __('Replicate Role'),
      fields: [
        {
          label: __('New Role Name'),
          fieldname: 'new_role_name',
          fieldtype: 'Data',
          default: this.frm.doc.name,
          reqd: 1,
        },
      ],
      freeze: true,
      freeze_message: __('Replicating Role...'),
      primary_action_label: __('Replicate'),
      primary_action: (values?: any) => this.replicate(values.new_role_name),
    })
    this.dialog.show()
  }
  replicate(this: any, new_role?: any) {
    this.dialog.hide()
    frappe.call({
      method: 'replicate_role',
      doc: this.frm.doc,
      args: { cur_role: this.frm.doc.name, new_role },
      callback: (r?: any) => this.on_replicated(r),
    })
  }
  on_replicated(r?: any) {
    if (r.message) {
      frappe.set_route('Form', 'Role', r.message)
      frappe.show_alert({
        message: __('New role created successfully.'),
        indicator: 'green',
      })
    } else if (r.exc) {
      JSON.parse(r.exc).forEach((err?: any) => frappe.show_alert({ message: __(err), indicator: 'red' }))
    }
  }
}
function client_save(doc?: any) {
  return frappe.call({ method: 'frappe.client.save', args: { doc } })
}
function unique_parents(rows?: any) {
  return [...new Set(rows.map((row?: any) => row.parent))]
}
function unique_values(rows?: any, field?: any) {
  return [...new Set((rows || []).map((row?: any) => row[field]).filter(Boolean))]
}
function not_in(values?: any) {
  return values.length ? values : ['']
}
function placeholder_html(message?: any) {
  return `<div class="text-muted">${message}</div>`
}
