import { $, __, frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.ui')
frappe.ui.Tree = class {
  [key: string]: any
  constructor({ label, root_value, icon_set, with_skeleton = 1 }: any) {
    $.extend(this, arguments[0])
    if (root_value == null) {
      this.root_value = label
    }
    this.setup_treenode_class()
    this.nodes = {}
    this.wrapper = $('<div class="tree" role="tree">').appendTo(this.parent)
    if (with_skeleton) this.wrapper.addClass('with-skeleton')
    if (this.use_row_actions || this.row_style) {
      this.wrapper.addClass('tree-rows')
    }
    if (this.use_row_actions) {
      this.wrapper.addClass('tree-has-row-actions')
    }
    if (!icon_set) {
      this.icon_set = {
        open: frappe.utils.icon('chevron-down', 'sm'),
        closed: frappe.utils.is_rtl()
          ? frappe.utils.icon('chevron-left', 'sm')
          : frappe.utils.icon('chevron-right', 'sm'),
        leaf: frappe.utils.icon('circle-small', 'xs'),
      }
    }
    this.setup_root_node()
  }
  get_nodes(this: any, value?: any, is_root?: any) {
    let args = Object.assign({}, this.args)
    args.parent = value
    args.is_root = is_root
    return new Promise((resolve?: any) => {
      frappe.call({
        method: this.method,
        args: args,
        callback: (r?: any) => {
          this.on_get_node && this.on_get_node(r.message)
          resolve(r.message)
        },
      })
    })
  }
  get_all_nodes(this: any, value?: any, is_root?: any, label?: any) {
    let args = Object.assign({}, this.args)
    args.label = label || value
    args.parent = value
    args.is_root = is_root
    args.tree_method = this.method
    return new Promise((resolve?: any) => {
      frappe.call({
        method: 'frappe.desk.treeview.get_all_nodes',
        args: args,
        callback: (r?: any) => {
          this.on_get_node && this.on_get_node(r.message, true)
          resolve(r.message)
        },
      })
    })
  }
  setup_treenode_class(this: any) {
    let tree = this
    this.TreeNode = class {
      [key: string]: any
      constructor() {
        $.extend(this, arguments[0])
        this.loaded = 0
        this.expanded = 0
        if (this.parent_label) {
          this.parent_node = tree.nodes[this.parent_label]
        }
        tree.nodes[this.label] = this
        tree.make_node_element(this)
        tree.on_render && tree.on_render(this)
      }
    }
  }
  setup_root_node(this: any) {
    this.root_node = new this.TreeNode({
      parent: this.wrapper,
      label: this.label,
      parent_label: null,
      expandable: true,
      is_root: true,
      data: {
        value: this.root_value,
      },
    })
    this.expand_node(this.root_node, false)
  }
  refresh(this: any) {
    this.selected_node.parent_node && this.load_children(this.selected_node.parent_node, true)
  }
  filter_nodes(this: any, txt?: any) {
    txt = (txt || '').trim().toLowerCase()
    const $wrapper = this.wrapper
    if (!txt) {
      $wrapper.removeClass('tree-searching')
      $wrapper.find('li.tree-node').show()
      return null
    }
    $wrapper.addClass('tree-searching')
    const $nodes = $wrapper.find('li.tree-node')
    $nodes.hide()
    let matches = 0
    $nodes.each((_i?: any, li?: any) => {
      const $li = $(li)
      const $link = $li.children('.tree-link')
      const label = ($link.find('.tree-label').text() || '') + ' ' + ($link.attr('data-label') || '')
      if (label.toLowerCase().includes(txt)) {
        matches++
        $li.show()
        $li.parentsUntil($wrapper, 'li.tree-node').show()
        $li.parents('ul.tree-children').show()
      }
    })
    return matches
  }
  get_expansion_state(this: any) {
    if (!this.root_node.expanded) return 'collapsed'
    if (!this.root_node.loaded) return 'collapsed'
    const expandable = Object.values(this.nodes).filter(
      (node?: any) => node.expandable && !node.is_root && document.body.contains(node.$tree_link[0]),
    )
    if (!expandable.length) return 'none'
    if (expandable.every((node?: any) => node.expanded)) return 'expanded'
    if (expandable.every((node?: any) => !node.expanded)) return 'collapsed'
    return 'partial'
  }
  make_node_element(this: any, node?: any) {
    node.$tree_link = $('<span class="tree-link">')
      .attr('data-label', node.label)
      .attr('role', 'treeitem')
      .attr('aria-expanded', node.expandable ? 'false' : null)
      .data('node', node)
      .appendTo(node.parent)
    node.$ul = $('<ul class="tree-children" role="group">').hide().appendTo(node.parent)
    this.make_icon_and_label(node)
    if (this.toolbar) {
      if (this.use_row_actions) {
        this.make_row_actions(node)
      } else {
        node.$toolbar = this.get_toolbar(node).insertAfter(node.$tree_link)
      }
    }
    if (this.use_row_actions && !node.is_root) {
      this.setup_node_hover_card(node)
    }
  }
  setup_node_hover_card(this: any, node?: any) {
    if (!(frappe.boot.link_preview_doctypes || []).includes(this.args.doctype)) return
    node.hover_card = frappe.ui.hover_card(node.$tree_link.find('a.tree-label'), {
      side: 'bottom',
      align: 'start',
      css_class: 'tree-node-hover-panel',
      content: () => this.build_node_hover_card(node),
    })
    node.$tree_link.one('mouseenter', () => this.get_node_preview(node))
  }
  build_node_hover_card(this: any, node?: any) {
    if (node.preview_empty) return null
    const $card = $(`
			<div class="tree-hover-card">
				${frappe.ui.skeleton.html({ width: '60%', height: '14px' })}
				${frappe.ui.skeleton.html({ width: '40%', height: '12px', css_class: 'mt-2' })}
			</div>
		`)
    this.get_node_preview(node).then((data?: any) => {
      if (!document.body.contains($card[0])) return
      if (!data) {
        node.hover_card && node.hover_card.close()
        return
      }
      $card.empty().append(this.render_node_hover_card(node, data))
    })
    return $card
  }
  get_node_preview(this: any, node?: any) {
    if (!node.preview_promise) {
      node.preview_promise = frappe
        .call({
          method: 'frappe.desk.link_preview.get_preview_data',
          args: { doctype: this.args.doctype, docname: node.label },
        })
        .then((r?: any) => {
          const data = r.message
          const meta = frappe.get_meta(this.args.doctype)
          const rows = data ? this.get_preview_rows(data) : []
          const has_value_column = node.parent && node.parent.children('.balance-area').length
          if (!data || (!meta?.image_field && !rows.length && !has_value_column)) {
            node.preview_empty = true
            node.hover_card && node.hover_card.destroy()
            return null
          }
          return data
        })
        .catch(() => {
          node.preview_empty = true
          node.hover_card && node.hover_card.destroy()
          return null
        })
    }
    return node.preview_promise
  }
  get_preview_rows(this: any, data?: any) {
    const doctype = this.args.doctype
    const parent_field = frappe.get_meta(doctype)?.nsm_parent_field || `parent_${frappe.scrub(doctype)}`
    const parent_label = frappe.meta.get_docfield(doctype, parent_field)?.label
    return Object.entries(data).filter(
      ([key, value]: any) =>
        !['preview_image', 'preview_title', 'name'].includes(key) && key !== parent_label && value != null,
    )
  }
  render_node_hover_card(this: any, node?: any, data?: any) {
    const doctype = this.args.doctype
    const meta = frappe.get_meta(doctype)
    const title = data.preview_title || data.name
    const subtitle = data.preview_title && data.preview_title !== data.name ? data.name : ''
    const $content = $('<div></div>')
    const $head = $('<div class="tree-hover-card-head flex items-start gap-2.5"></div>').appendTo($content)
    if (meta && meta.image_field) {
      $head.append(
        frappe.ui.avatar.html({
          label: title,
          image: data.preview_image || undefined,
          size: 'lg',
        }),
      )
    }
    const $titles = $('<div class="flex-1 min-w-0"></div>').appendTo($head)
    $('<div class="text-base-semibold text-ink-gray-8 truncate"></div>').text(title).appendTo($titles)
    if (subtitle) {
      $('<div class="text-sm text-ink-gray-6 truncate mt-0.5"></div>').text(subtitle).appendTo($titles)
    }
    $(
      frappe.ui.button({
        icon: 'external-link',
        variant: 'ghost',
        size: 'xs',
        title: __('Open'),
        onclick: () => frappe.set_route('Form', doctype, data.name),
      }),
    ).appendTo($head)
    if (node.expandable) {
      $('<div class="flex gap-1.5 mt-2"></div>')
        .append(frappe.ui.badge({ label: __('Group'), size: 'sm' }))
        .appendTo($content)
    }
    const rows = this.get_preview_rows(data)
    const $balance = node.parent && node.parent.children('.balance-area').first()
    if (rows.length || ($balance && $balance.length)) {
      $('<div class="border-t my-2.5"></div>').appendTo($content)
      const add_row = (label?: any, $value?: any) => {
        const $row = $('<div class="tree-hover-card-row flex items-center justify-between gap-3"></div>').appendTo(
          $content,
        )
        $('<div class="text-sm text-ink-gray-6 shrink-0"></div>').text(label).appendTo($row)
        const plain_text = $('<div></div>')
          .html($value.html().replace(/<br\s*\/?>|<\/(p|div)>/gi, '\n'))
          .text()
          .trim()
        $value.addClass('value text-sm text-ink-gray-7 truncate').attr('title', plain_text).appendTo($row)
      }
      rows.forEach(([label, value]: any) => {
        add_row(__(label), $('<div></div>').html(value))
      })
      if ($balance && $balance.length) {
        add_row(__('Balance'), $('<div></div>').text($balance.text().trim()))
      }
    }
    return $content
  }
  get_toolbar_items(this: any, node?: any) {
    return Object.values(this.toolbar || {}).filter((obj?: any) => obj.label && (!obj.condition || obj.condition(node)))
  }
  get_node_menu_options(this: any, node?: any) {
    if (!node) return []
    const items = this.get_toolbar_items(node).filter((obj?: any) => !obj.inline)
    items.sort((a?: any, b?: any) => (a.danger ? 1 : 0) - (b.danger ? 1 : 0))
    return items.map((obj?: any) => {
      const reason = obj.get_disabled_reason && obj.get_disabled_reason(node)
      return {
        label: obj.get_label ? obj.get_label() : obj.label,
        icon: obj.icon,
        theme: obj.danger ? 'red' : undefined,
        disabled: !!reason,
        description: reason || undefined,
        onclick: () => obj.click(node),
      }
    })
  }
  make_row_actions(this: any, node?: any) {
    const items = this.get_toolbar_items(node)
    if (!items.length) return
    const $actions = $('<span class="tree-actions">').appendTo(node.$tree_link)
    const inline = items.filter((obj?: any) => obj.inline && obj.icon)
    const overflow = items.filter((obj?: any) => !obj.inline)
    inline.forEach((obj?: any) => {
      const label = obj.get_label ? obj.get_label() : obj.label
      $(
        frappe.ui.button({
          icon: obj.icon,
          variant: 'ghost',
          size: 'xs',
          title: label,
          onclick: (e?: any) => {
            e.stopPropagation()
            obj.click(node)
          },
        }),
      ).appendTo($actions)
    })
    if (overflow.length) {
      node.context_menu = new frappe.ui.ContextMenu({
        target: node.$tree_link,
        options: () => this.get_node_menu_options(node),
      })
      const $more = $(
        frappe.ui.button({
          icon: 'ellipsis',
          variant: 'ghost',
          size: 'xs',
          title: __('More actions'),
          onclick: (e?: any) => {
            e.stopPropagation()
            const rect = e.currentTarget.getBoundingClientRect()
            node.context_menu.open_at(rect.left, rect.bottom + 2)
          },
        }),
      ).appendTo($actions)
      $more.addClass('tree-more-btn')
    }
    $actions.on('click', (e?: any) => e.stopPropagation())
  }
  add_node(this: any, node?: any, data?: any) {
    let $li = $('<li class="tree-node">')
    return new this.TreeNode({
      parent: $li.appendTo(node.$ul),
      parent_label: node.label,
      label: data.value,
      title: data.title,
      expandable: data.expandable,
      data: data,
    })
  }
  get_selected_node(this: any) {
    return this.selected_node
  }
  set_selected_node(this: any, node?: any) {
    this.selected_node = node
  }
  load_children(this: any, node?: any, deep: any = false) {
    const value = node.data.value,
      is_root = node.is_root
    return deep
      ? frappe.run_serially([
          () => this.get_all_nodes(value, is_root, node.label),
          (data_list?: any) => this.render_children_of_all_nodes(data_list),
          () => this.set_selected_node(node),
          () => this.on_node_render && this.on_node_render(node, deep),
        ])
      : frappe.run_serially([
          () => this.get_nodes(value, is_root),
          (data_set?: any) => this.render_node_children(node, data_set),
          () => this.set_selected_node(node),
          () => this.on_node_render && this.on_node_render(node, deep),
        ])
  }
  render_children_of_all_nodes(this: any, data_list?: any) {
    data_list.map((d?: any) => this.render_node_children(this.nodes[d.parent], d.data))
  }
  render_node_children(this: any, node?: any, data_set?: any) {
    node.$ul.empty()
    if (data_set) {
      $.each(data_set, (_i?: any, data?: any) => {
        let child_node = this.add_node(node, data)
        child_node.$tree_link.data('node-data', data).data('node', child_node)
      })
    }
    node.expanded = false
    node.loaded = true
    this.expand_node(node)
  }
  on_node_click(this: any, node?: any) {
    this.expand_node(node)
    frappe.dom.activate(this.wrapper, node.$tree_link, 'tree-link')
    if (node.$toolbar) this.show_toolbar(node)
  }
  expand_node(this: any, node?: any, click: any = true) {
    this.set_selected_node(node)
    if (click) {
      this.on_click && this.on_click(node)
    }
    if (node.expandable) {
      this.toggle_node(node)
    }
    this.select_link(node)
    node.expanded = !node.expanded
    node.parent.toggleClass('opened', node.expanded)
    if (node.expandable) {
      node.$tree_link.attr('aria-expanded', String(!!node.expanded))
    }
  }
  toggle_node(this: any, node?: any) {
    if (node.expandable && this.get_nodes && !node.loaded) {
      return this.load_children(node)
    }
    if (node.$ul) {
      if (node.$ul.children().length) {
        node.$ul.toggle(!node.expanded)
      }
      if (this.icon_set) {
        let $toggle = node.$tree_link.children().first()
        if (!node.expanded) {
          $toggle.html(this.icon_set.open)
        } else {
          $toggle.addClass('node-parent').html(this.icon_set.closed)
        }
      }
    }
  }
  select_link(this: any, node?: any) {
    this.wrapper.find('.selected').removeClass('selected')
    node.$tree_link.toggleClass('selected')
  }
  show_toolbar(this: any, node?: any) {
    if (!node.$toolbar) return
    if (this.cur_toolbar) $(this.cur_toolbar).hide()
    this.cur_toolbar = node.$toolbar
    node.$toolbar.show()
  }
  get_node_label(this: any, node?: any) {
    if (this.get_label) {
      return this.get_label(node)
    }
    if (node.title && node.title != node.label) {
      return (
        frappe.utils.escape_html(__(node.title)) +
        ` <span class='text-muted'>(${frappe.utils.escape_html(node.label)})</span>`
      )
    } else {
      return frappe.utils.escape_html(__(node.title || node.label))
    }
  }
  make_icon_and_label(this: any, node?: any) {
    let icon_html = ''
    if (this.icon_set) {
      if (node.expandable) {
        icon_html = `<span class="node-parent">${this.icon_set.closed}</span>`
      } else {
        icon_html = `<span>${this.icon_set.leaf}</span>`
      }
    }
    $(icon_html).appendTo(node.$tree_link)
    $(
      `<a class="tree-label" data-doctype="${frappe.utils.escape_html(this.args.doctype)}" data-name="${frappe.utils.escape_html(node.label)}"> ${this.get_node_label(node)}</a>`,
    ).appendTo(node.$tree_link)
    node.$tree_link.on('click', () => {
      setTimeout(() => {
        this.on_node_click(node)
      }, 100)
    })
    if (!this.use_row_actions && !this.row_style) {
      node.$tree_link.hover(
        function (this: any) {
          $(this).parent().addClass('hover-active')
        },
        function (this: any) {
          $(this).parent().removeClass('hover-active')
        },
      )
    }
  }
  get_toolbar(this: any, node?: any) {
    let $toolbar = $('<span class="tree-node-toolbar btn-group"></span>').hide()
    Object.keys(this.toolbar).map((key?: any) => {
      let obj = this.toolbar[key]
      if (!obj.label) return
      if (obj.condition && !obj.condition(node)) return
      let label = obj.get_label ? obj.get_label() : obj.label
      let $link = $("<button class='btn btn-default btn-xs'></button>")
        .html(label)
        .addClass('tree-toolbar-button ' + (obj.btnClass || ''))
        .appendTo($toolbar)
      $link.on('click', () => {
        obj.click(node)
      })
    })
    return $toolbar
  }
}
