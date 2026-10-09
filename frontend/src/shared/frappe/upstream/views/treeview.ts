import { $, __, cint, cur_tree, frappe } from '@/shared/frappe/runtime'

frappe.provide('frappe.treeview_settings')
frappe.provide('frappe.views.trees')
window.cur_tree = null
frappe.views.TreeFactory = class TreeFactory extends frappe.views.Factory {
  [key: string]: any
  make(route: any) {
    frappe.model.with_doctype(route[1], function () {
      let options: any = {
        doctype: route[1],
        meta: frappe.get_meta(route[1]),
      }
      if (!frappe.treeview_settings[route[1]] && !frappe.meta.get_docfield(route[1], 'is_group')) {
        frappe.msgprint(__('Tree view is not available for {0}', [route[1]]))
        return false
      }
      $.extend(options, frappe.treeview_settings[route[1]] || {})
      frappe.views.trees[options.doctype] = new frappe.views.TreeView(options)
    })
  }
  on_show() {
    let route = frappe.get_route()
    let treeview = frappe.views.trees[route[1]]
    if (treeview && treeview.tree) {
      window.cur_tree = treeview.tree
      if (treeview.scroll_position) {
        frappe.utils.scroll_to(treeview.scroll_position, false, 0, $('.main-section'))
      }
    }
  }
  get view_name() {
    return 'Tree'
  }
}
frappe.views.TreeViewSelect = class TreeViewSelect extends frappe.views.ListViewSelect {
  [key: string]: any
  set_current_view(this: any) {
    this.current_view = 'Tree'
  }
  set_route(this: any, view: any, calendar_name: any) {
    const route: any = [this.slug(), 'view', view]
    if (calendar_name) route.push(calendar_name)
    frappe.set_route(route)
  }
}
frappe.views.TreeView = class TreeView {
  [key: string]: any
  constructor(opts: any) {
    let me = this
    this.opts = {}
    this.opts.get_tree_root = true
    this.opts.show_expand_all = true
    $.extend(this.opts, opts)
    this.doctype = opts.doctype
    this.args = { doctype: me.doctype }
    this.page_name = frappe.get_route_str()
    this.get_tree_nodes = me.opts.get_tree_nodes || 'frappe.desk.treeview.get_children'
    this.get_permissions()
    this.make_page()
    this.make_filters()
    this.root_value = null
    if (me.opts.get_tree_root) {
      this.get_root()
    }
    this.onload()
    if (!this.opts.do_not_setup_menu) {
      this.set_menu_item()
    }
    this.set_primary_action()
  }
  get_permissions(this: any) {
    this.can_read = frappe.model.can_read(this.doctype)
    this.can_create =
      frappe.boot.user.can_create.indexOf(this.doctype) !== -1 ||
      frappe.boot.user.in_create.indexOf(this.doctype) !== -1
    this.can_write = frappe.model.can_write(this.doctype)
    this.can_delete = frappe.model.can_delete(this.doctype)
  }
  make_page(this: any) {
    let row: any
    let me = this
    if (!this.opts || !this.opts.do_not_make_page) {
      this.parent = frappe.container.add_page(this.page_name)
      $(this.parent).addClass('treeview')
      $('.main-section').on('scroll.treeview_' + this.page_name, () => {
        if (frappe.get_route_str() === me.page_name) {
          me.scroll_position = $('.main-section').scrollTop()
        }
      })
      frappe.ui.make_app_page({ parent: this.parent, single_column: true })
      this.page = this.parent.page
      frappe.container.change_to(this.page_name)
      this.set_title()
      this.setup_view_switcher()
      this.page.add_action_icon(
        'refresh-cw',
        () => {
          this.make_tree()
        },
        '',
        __('Reload Tree'),
      )
      this.page.main.css({
        'min-height': '300px',
      })
      this.make_tree_toolbar()
      if (this.opts.view_template) {
        row = $('<div class="row"><div>').appendTo(this.page.main)
        this.body = $('<div class="col-sm-6 col-xs-12"></div>').appendTo(row)
        this.node_view = $('<div class="col-sm-6 hidden-xs"></div>').appendTo(row)
      } else {
        this.body = $('<div class="tree-view-body"></div>').appendTo(this.page.main)
      }
    } else {
      this.page = this.opts.page
      $(this.page[0]).addClass('frappe-card')
      this.body = this.page.main
    }
  }
  make_tree_toolbar(this: any) {
    this.page.page_form.removeClass('row').addClass('flex')
    this.$filter_area = $('<div class="standard-filter-section flex"></div>').appendTo(this.page.page_form)
    let search_field = this.page.add_field(
      {
        fieldtype: 'Data',
        fieldname: 'tree_search',
        label: __('ID'),
      },
      this.$filter_area,
    )
    this.$search_input = search_field.$input
    this.$search_input.on(
      'input',
      frappe.utils.debounce(() => this.apply_search(search_field.get_value()), 300),
    )
    if (this.opts.show_expand_all) {
      let $actions = $('<div class="tree-toolbar-actions ms-auto flex items-center gap-1 py-1"></div>').appendTo(
        this.page.page_form,
      )
      frappe.ui
        .dropdown({
          button: { label: __('Expand/Collapse'), icon_right: 'chevron-down' },
          align: 'end',
          options: () => {
            const state = this.tree ? this.tree.get_expansion_state() : 'none'
            return [
              {
                label: __('Expand All'),
                icon: 'copy-plus',
                disabled: !(state === 'collapsed' || state === 'partial'),
                onclick: () => {
                  this.tree.load_children(this.tree.root_node, true)
                },
              },
              {
                label: __('Collapse All'),
                icon: 'copy-minus',
                disabled: !(state === 'expanded' || state === 'partial'),
                onclick: () => {
                  this.tree.load_children(this.tree.root_node, false)
                },
              },
            ]
          },
        })
        .appendTo($actions)
    }
  }
  set_title(this: any) {
    this.page.set_title(this.opts.title || __('{0} Tree', [__(this.doctype)]))
  }
  setup_view_switcher(this: any) {
    if (!frappe.boot.desk_settings.view_switcher || this.opts.meta?.force_re_route_to_default_view) {
      return
    }
    this.views_list = new frappe.views.TreeViewSelect({
      doctype: this.doctype,
      page: this.page,
      list_view: {
        meta: this.opts.meta || frappe.get_meta(this.doctype),
        settings: frappe.listview_settings[this.doctype] || {},
      },
      icon_map: frappe.views.view_icon_map,
      label_map: frappe.views.get_view_label_map(),
    })
  }
  onload(this: any) {
    let me = this
    this.opts.onload && this.opts.onload(me)
  }
  make_filters(this: any) {
    let me = this
    $.each(this.opts.filters || [], function (_i: any, filter: any) {
      if (frappe.route_options && frappe.route_options[filter.fieldname]) {
        filter.default = frappe.route_options[filter.fieldname]
      }
      if (!filter.disable_onchange) {
        filter.change = function (this: any) {
          filter.onchange && filter.onchange()
          let val = this.get_value()
          me.args[filter.fieldname] = val
          if (val) {
            me.root_label = val
          } else {
            me.root_label = me.opts.root_label
          }
          me.set_title()
          me.make_tree()
        }
      }
      let field = me.page.add_field(filter, me.$filter_area || me.page.filters)
      if (filter.default) {
        if (field && field.$input) {
          field.$input.trigger('change')
        } else {
          $("[data-fieldname='" + filter.fieldname + "']").trigger('change')
        }
      }
    })
    if (!this.opts.do_not_make_page && frappe.meta.has_field(this.doctype, 'disabled')) {
      let field = me.page.add_field(
        {
          fieldname: 'include_disabled',
          fieldtype: 'Check',
          label: __('Show all (including disabled)'),
          change: function () {
            me.args['include_disabled'] = cint(field.get_value())
            me.make_tree()
          },
        },
        me.$filter_area,
      )
    }
  }
  get_root(this: any) {
    let me = this
    frappe.call({
      method: me.get_tree_nodes,
      args: me.args,
      callback: function (r: any) {
        if (r.message) {
          if (r.message.length == 1) {
            me.root_label = r.message[0]['value']
            me.root_value = me.root_label
          } else {
            me.root_label = me.doctype
            me.root_value = ''
          }
          me.make_tree()
        }
      },
    })
  }
  show_tree_skeleton(this: any) {
    if (!this.body || this.opts.do_not_make_page) return
    this.hide_tree_skeleton()
    const row = (indent: any, width: any) => `
			<div class="flex items-center gap-2.5" style="height: 32px; padding-left: ${indent}px">
				${frappe.ui.skeleton.html({ width: '14px', height: '14px' })}
				${frappe.ui.skeleton.html({ width: width, height: '13px' })}
			</div>`
    this.$tree_skeleton = $(`
			<div class="tree-skeleton p-1" aria-busy="true" aria-label="${__('Loading')}">
				${row(8, '90px')}
				${row(32, '220px')}
				${row(32, '180px')}
				${row(32, '240px')}
				${row(32, '160px')}
			</div>
		`).appendTo(this.body)
  }
  hide_tree_skeleton(this: any) {
    this.$tree_skeleton && this.$tree_skeleton.remove()
    this.$tree_skeleton = null
    this.tree && this.tree.wrapper.show()
  }
  update_tree_empty_state(this: any) {
    this.$tree_empty_state && this.$tree_empty_state.remove()
    this.$tree_empty_state = null
    const root = this.tree && this.tree.root_node
    if (!this.body || !root || !root.loaded) return
    if (root.$ul && root.$ul.children().length) return
    const opts: any = {
      icon: 'list-tree',
      title: __('No {0} records yet', [__(this.doctype)]),
      description: __('Records you add will appear here.'),
    }
    this.$tree_empty_state = (
      frappe.ui.empty_state
        ? frappe.ui.empty_state(opts)
        : $(
            `<div class="text-muted text-center" style="padding: 40px 0;">${frappe.utils.escape_html(opts.title)}</div>`,
          )
    )
      .addClass('tree-empty-state')
      .appendTo(this.body)
  }
  make_tree(this: any) {
    this._expanded_labels = this.tree
      ? Object.values(this.tree.nodes)
          .filter((node: any) => node.expanded && !node.is_root)
          .map((node: any) => node.label)
      : []
    $(this.parent).find('.tree').remove()
    this.$tree_empty_state && this.$tree_empty_state.remove()
    this.$tree_empty_state = null
    this.reset_search()
    this.show_tree_skeleton()
    let use_label = this.args[this.opts.root_label] || this.root_label || this.opts.root_label
    let use_value = this.root_value
    if (use_value == null) {
      use_value = use_label
    }
    this.tree = new frappe.ui.Tree({
      parent: this.body,
      label: use_label,
      root_value: use_value,
      expandable: true,
      use_row_actions: this.opts.use_row_actions ?? !this.opts.do_not_make_page,
      row_style: this.opts.row_style,
      args: this.args,
      method: this.get_tree_nodes,
      toolbar: this.get_toolbar(),
      get_label: this.opts.get_label,
      on_render: this.opts.onrender,
      on_get_node: this.opts.on_get_node,
      on_node_render: (node: any, deep: any) => {
        this.hide_tree_skeleton()
        this.restore_expanded_nodes()
        this.update_tree_empty_state()
        this.opts.on_node_render && this.opts.on_node_render(node, deep)
      },
      on_click: (node: any) => {
        this.select_node(node)
      },
    })
    if (this.$tree_skeleton) {
      this.tree.wrapper.hide()
    }
    window.cur_tree = this.tree
    cur_tree.view_name = 'Tree'
    this.post_render()
  }
  restore_expanded_nodes(this: any) {
    if (!this._expanded_labels?.length || !this.tree) return
    this._expanded_labels = this._expanded_labels.filter((label: any) => {
      const node = this.tree.nodes[label]
      if (!node) return true
      if (!node.expandable || node.expanded) return false
      if (!document.body.contains(node.$tree_link[0])) return true
      this.tree.load_children(node)
      return false
    })
  }
  reset_search(this: any) {
    this.search_deep_loaded = false
    this.$search_input && this.$search_input.val('')
    this.$search_empty_state && this.$search_empty_state.remove()
    this.tree && this.tree.wrapper.removeClass('tree-searching')
  }
  apply_search(this: any, txt: any) {
    txt = (txt || '').trim().toLowerCase()
    this.search_text = txt
    if (!this.tree) return
    this.$search_empty_state && this.$search_empty_state.remove()
    if (!txt) {
      this.tree.filter_nodes('')
      return
    }
    const run = () => {
      if (this.search_text !== txt) return
      const matches = this.tree.filter_nodes(txt)
      if (matches === 0) {
        this.$search_empty_state = $(
          frappe.ui.empty_state({
            icon: 'search',
            title: __('No matching records'),
            description: __('Try a different search.'),
          }),
        ).appendTo(this.body)
      }
    }
    if (this.search_deep_loaded) {
      run()
      return
    }
    frappe.dom.freeze(__('Loading full tree...'))
    Promise.resolve(this.tree.load_children(this.tree.root_node, true))
      .then(() => {
        this.search_deep_loaded = true
        run()
      })
      .finally(() => frappe.dom.unfreeze())
  }
  rebuild_tree(this: any) {
    let me = this
    frappe.call({
      method: 'frappe.utils.nestedset.rebuild_tree_for_doctype',
      args: {
        doctype: me.doctype,
      },
      callback: function (r: any) {
        if (!r.exc) {
          me.make_tree()
        }
      },
    })
  }
  post_render(this: any) {
    let me = this
    me.opts.post_render && me.opts.post_render(me)
  }
  select_node(this: any, node: any) {
    let me = this
    if (this.opts.click) {
      this.opts.click(node)
    }
    if (this.opts.view_template) {
      this.node_view.empty()
      $(
        frappe.render_template(me.opts.view_template, {
          data: node.data,
          doctype: me.doctype,
        }),
      ).appendTo(this.node_view)
    }
  }
  get_toolbar(this: any) {
    let me = this
    let toolbar: any = [
      {
        label: __(me.can_write ? 'Edit' : 'Details'),
        icon: 'pencil',
        inline: true,
        condition: function (node: any) {
          return !node.is_root && me.can_read
        },
        click: function (node: any) {
          frappe.set_route('Form', me.doctype, node.label)
        },
      },
      {
        label: __('Add Child'),
        icon: 'plus',
        condition: function (node: any) {
          return me.can_create && node.expandable && !node.hide_add
        },
        click: function () {
          me.new_node()
        },
        btnClass: 'hidden-xs',
      },
      {
        label: __('Move to...'),
        icon: 'corner-down-right',
        condition: function (node: any) {
          return !node.is_root && me.can_write
        },
        click: function (node: any) {
          me.move_node(node)
        },
      },
      {
        label: __('Rename'),
        icon: 'text-cursor-input',
        condition: function () {
          return me.can_write && frappe.get_meta(me.doctype)?.allow_rename != 0
        },
        get_disabled_reason: function (node: any) {
          if (node.is_root) return __("Root records can't be renamed")
        },
        click: function (node: any) {
          frappe.model.rename_doc(me.doctype, node.label, function (new_name: any) {
            node.$tree_link.find('a').text(new_name)
            node.label = new_name
            me.tree.refresh()
          })
        },
        btnClass: 'hidden-xs',
      },
      {
        label: __('Delete'),
        icon: 'trash',
        danger: true,
        condition: function () {
          return me.can_delete
        },
        get_disabled_reason: function (node: any) {
          if (node.is_root) return __("Root records can't be deleted")
        },
        click: function (node: any) {
          frappe.model.delete_doc(me.doctype, node.label, function () {
            node.parent.remove()
          })
        },
        btnClass: 'hidden-xs',
      },
    ]
    if (this.opts.toolbar && this.opts.extend_toolbar) {
      toolbar = toolbar.filter((btn: any) => {
        return !me.opts.toolbar.find((d: any) => d['label'] == btn['label'])
      })
      return toolbar.concat(this.opts.toolbar)
    } else if (this.opts.toolbar && !this.opts.extend_toolbar) {
      return this.opts.toolbar
    } else {
      return toolbar
    }
  }
  move_node(this: any, node: any) {
    let me = this
    me.tree.get_all_nodes(me.tree.root_value, true, me.tree.label).then((groups: any) => {
      const children_of: any = {}
      const all: any = []
      ;(groups || []).forEach((group: any) => {
        ;(group.data || []).forEach((d: any) => {
          all.push(d.value)
          children_of[group.parent] = children_of[group.parent] || []
          children_of[group.parent].push(d.value)
        })
      })
      const subtree = new Set([node.label])
      const stack: any = [node.label]
      while (stack.length) {
        ;(children_of[stack.pop()] || []).forEach((name: any) => {
          if (!subtree.has(name)) {
            subtree.add(name)
            stack.push(name)
          }
        })
      }
      me.show_move_dialog(
        node,
        all.filter((name: any) => !subtree.has(name)),
      )
    })
  }
  show_move_dialog(this: any, node: any, candidates: any) {
    let me = this
    const parent_fieldname =
      frappe.get_meta(me.doctype)?.nsm_parent_field ||
      'parent_' + me.doctype.toLowerCase().replace(/ /g, '_').replace(/-/g, '_')
    const dialog = new frappe.ui.Dialog({
      title: __('Move {0}', [node.label]),
      fields: [
        {
          fieldtype: 'Link',
          fieldname: 'new_parent',
          label: __('New Parent'),
          options: me.doctype,
          reqd: 1,
          ignore_link_validation: 1,
          get_query: () => {
            const filters: any = { name: ['in', candidates] }
            if (frappe.meta.has_field(me.doctype, 'is_group')) {
              filters.is_group = 1
            }
            return { filters }
          },
        },
      ],
      primary_action_label: __('Move'),
      primary_action(values: any) {
        dialog.hide()
        frappe.dom.freeze(__('Moving {0}', [node.label]))
        frappe.call({
          method: 'frappe.client.set_value',
          args: {
            doctype: me.doctype,
            name: node.label,
            fieldname: parent_fieldname,
            value: values.new_parent,
          },
          callback: function (r: any) {
            if (r.exc) return
            node.parent_node && me.tree.load_children(node.parent_node)
            const target = me.tree.nodes[values.new_parent]
            if (target && target !== node.parent_node && target.loaded) {
              me.tree.load_children(target)
            }
            frappe.show_alert({
              message: __('{0} moved under {1}', [node.label, values.new_parent]),
              indicator: 'green',
            })
          },
          always: function () {
            frappe.dom.unfreeze()
          },
        })
      },
    })
    dialog.show()
  }
  new_node(this: any) {
    let me = this
    let node = me.tree.get_selected_node()
    if (!(node && node.expandable)) {
      frappe.msgprint(__('Select a group {0} first.', [__(me.doctype)]))
      return
    }
    this.prepare_fields()
    let d = new frappe.ui.Dialog({
      title: __('New {0}', [__(me.doctype)]),
      fields: me.fields,
    })
    let args = $.extend({}, me.args)
    args['parent_' + me.doctype.toLowerCase().replace(/ /g, '_').replace(/-/g, '_')] = me.args['parent']
    d.set_value('is_group', 0)
    d.set_values(args)
    d.set_primary_action(__('Create New'), function (this: any) {
      let v = d.get_values()
      if (!v) return
      v.parent = node.label
      v.doctype = me.doctype
      if (node.is_root) {
        v['is_root'] = node.is_root
      } else {
        v['is_root'] = false
      }
      d.hide()
      frappe.dom.freeze(__('Creating {0}', [me.doctype]))
      $.extend(args, v)
      return frappe.call({
        method: me.opts.add_tree_node || 'frappe.desk.treeview.add_node',
        args: args,
        callback: function (r: any) {
          if (!r.exc) {
            me.tree.load_children(node)
          }
        },
        always: function () {
          frappe.dom.unfreeze()
        },
      })
    })
    d.show()
  }
  prepare_fields(this: any) {
    let me = this
    this.fields = [
      {
        fieldtype: 'Check',
        fieldname: 'is_group',
        label: __('Is Group'),
        description: __("Further sub-groups can only be created under records marked as 'Group'"),
      },
    ]
    if (this.opts.fields) {
      this.fields = this.opts.fields.slice()
    }
    this.ignore_fields = this.opts.ignore_fields || []
    let mandatory_fields = $.map(me.opts.meta.fields, function (d: any) {
      return d.reqd || (d.bold && !d.read_only && !!d.is_virtual) ? d : null
    })
    let opts_field_names = this.fields.map(function (d: any) {
      return d.fieldname
    })
    mandatory_fields.map(function (d: any) {
      if ($.inArray(d.fieldname, me.ignore_fields) === -1 && $.inArray(d.fieldname, opts_field_names) === -1) {
        me.fields.push(d)
      }
    })
  }
  print_tree(this: any) {
    if (!frappe.model.can_print(this.doctype)) {
      frappe.msgprint(__('You are not allowed to print this report'))
      return false
    }
    let $print_tree = $('.tree:visible').clone()
    $print_tree.find('.tree-actions').remove()
    let tree = $print_tree.html()
    let me = this
    frappe.ui.get_print_settings(false, function (print_settings: any) {
      let title = __(me.docname || me.doctype)
      frappe.render_tree({ title: title, tree: tree, print_settings: print_settings })
      frappe.call({
        method: 'frappe.core.doctype.access_log.access_log.make_access_log',
        args: {
          doctype: me.doctype,
          report_name: me.page_name,
          page: tree,
          method: 'Print',
        },
      })
    })
  }
  set_primary_action(this: any) {
    let me = this
    if (!this.opts.disable_add_node && this.can_create) {
      const primary_action = () => me.new_node()
      me.page.set_primary_action(
        {
          label: __('Add {0}', [__(this.doctype)], 'Primary action in tree view'),
          short_label: __('Add'),
        },
        primary_action,
        'plus',
      )
      frappe.ui.keys.add_shortcut({
        shortcut: 'ctrl+b',
        action: () => {
          primary_action()
          return true
        },
        description: __('Create a new document', null, 'Description of a tree view shortcut'),
        page: this.page,
      })
    }
  }
  set_menu_item(this: any) {
    let me = this
    this.menu_items = [
      {
        label: __('Print'),
        action: function () {
          me.print_tree()
        },
      },
    ]
    if (!this.views_list) {
      this.menu_items.unshift({
        label: __('View List'),
        action: function () {
          frappe.set_route(['List', me.doctype, 'List'])
        },
      })
    }
    if (
      frappe.user.has_role('System Manager') &&
      frappe.meta.has_field(me.doctype, 'lft') &&
      frappe.meta.has_field(me.doctype, 'rgt')
    ) {
      this.menu_items.push({
        label: __('Rebuild Tree'),
        action: function () {
          me.rebuild_tree()
        },
      })
    }
    if (me.opts.menu_items) {
      me.menu_items.push(...me.opts.menu_items)
    }
    $.each(me.menu_items, function (_i: any, menu_item: any) {
      let has_perm = true
      if (menu_item['condition']) {
        has_perm =
          typeof menu_item['condition'] === 'function' ? menu_item['condition']() : eval(menu_item['condition'])
      }
      if (has_perm) {
        me.page.add_menu_item(menu_item['label'], menu_item['action'])
      }
    })
  }
}
