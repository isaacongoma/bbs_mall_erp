import { $, __, frappe, hrms } from '@/shared/frappe'

import html2canvas from 'html2canvas'
hrms.HierarchyChart = class {
  [key: string]: any
  constructor(doctype: any, wrapper: any, method: any) {
    this.page = wrapper.page
    this.method = method
    this.doctype = doctype
    this.page.main.addClass('frappe-card hierarchy-chart-main')
    this.nodes = {}
    this.setup_node_class()
  }
  setup_node_class(this: any) {
    let me = this
    this.Node = class {
      [key: string]: any
      constructor() {
        $.extend(this, arguments[0])
        this.expanded = 0
        me.nodes[this.id] = this
        me.make_node_element(this)
        if (!me.all_nodes_expanded) {
          me.setup_node_click_action(this)
        }
        me.setup_edit_node_action(this)
      }
    }
  }
  make_node_element(node: any) {
    let node_card = frappe.render_template('node_card', {
      id: node.id,
      name: node.name,
      title: node.title,
      image: node.image,
      parent: node.parent_id,
      connections: node.connections,
      is_mobile: false,
    })
    node.parent.append(node_card)
    node.$link = $(`[id="${node.id}"]`)
  }
  show(this: any) {
    this.setup_actions()
    if (this.page.main.find('[data-fieldname="company"]').length) return
    let me = this
    let company = this.page.add_field({
      fieldtype: 'Link',
      options: 'Company',
      fieldname: 'company',
      placeholder: __('Select Company'),
      default: frappe.defaults.get_default('company'),
      only_select: true,
      reqd: 1,
      change: () => {
        me.company = ''
        $('#hierarchy-chart-wrapper').remove()
        if (company.get_value()) {
          me.company = company.get_value()
          me.make_svg_markers()
          me.setup_hierarchy()
          me.render_root_nodes()
          me.all_nodes_expanded = false
        } else {
          frappe.throw(__('Please select a company first.'))
        }
      },
    })
    company.refresh()
    $(`[data-fieldname="company"]`).trigger('change')
    $(`[data-fieldname="company"] .link-field`).addClass('hierarchy-company-link-field')
  }
  set_main_state(this: any, state: any) {
    const state_classes = 'hierarchy-main-chart hierarchy-main-empty hierarchy-main-export'
    this.page.main.removeClass(state_classes)
    if (state) {
      this.page.main.addClass(state)
    }
  }
  setup_actions(this: any) {
    let me = this
    this.page.clear_inner_toolbar()
    this.page.add_inner_button(__('Export'), function () {
      me.export_chart()
    })
    this.page.add_inner_button(__('Expand All'), function () {
      me.load_children(me.root_node, true)
      me.all_nodes_expanded = true
      me.page.remove_inner_button(__('Expand All'))
      me.page.add_inner_button(__('Collapse All'), function () {
        me.setup_hierarchy()
        me.render_root_nodes()
        me.all_nodes_expanded = false
        me.page.remove_inner_button(__('Collapse All'))
        me.setup_actions()
      })
    })
  }
  export_chart(this: any) {
    frappe.dom.freeze(__('Exporting...'))
    this.set_main_state('hierarchy-main-export')
    $('.node-card').addClass('exported')
    html2canvas(document.querySelector('#hierarchy-chart-wrapper') as HTMLElement, {
      scrollY: -window.scrollY,
      scrollX: 0,
    })
      .then(function (canvas: any) {
        let dataURL = canvas.toDataURL('image/png')
        let a = document.createElement('a')
        a.href = dataURL
        a.download = 'hierarchy_chart'
        a.click()
      })
      .finally(() => {
        this.set_main_state('hierarchy-main-chart')
        $('.node-card').removeClass('exported')
        frappe.dom.unfreeze()
      })
  }
  setup_hierarchy(this: any) {
    if (this.$hierarchy) this.$hierarchy.remove()
    $(`#connectors`).empty()
    this.$hierarchy = $(`<ul class="hierarchy">
				<li class="root-level level">
					<ul class="node-children"></ul>
				</li>
			</ul>`)
    this.page.main.find('#hierarchy-chart').empty().append(this.$hierarchy)
    this.nodes = {}
  }
  make_svg_markers(this: any) {
    $('#hierarchy-chart-wrapper').remove()
    this.page.main.append(`
			<div id="hierarchy-chart-wrapper">
				<svg id="arrows" width="100%" height="100%">
					<defs>
						<marker id="arrowhead-active" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="6" markerHeight="6" orient="auto" fill="var(--gray-600)">
							<path d="M 0 0 L 10 5 L 0 10 z"></path>
						</marker>
						<marker id="arrowhead-collapsed" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="6" markerHeight="6" orient="auto" fill="var(--gray-400)">
							<path d="M 0 0 L 10 5 L 0 10 z"></path>
						</marker>

						<marker id="arrowstart-active" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="8" markerHeight="8" orient="auto" fill="var(--gray-600)">
							<circle cx="4" cy="4" r="3.5" fill="white" stroke="var(--gray-600)"/>
						</marker>
						<marker id="arrowstart-collapsed" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="8" markerHeight="8" orient="auto" fill="var(--gray-400)">
							<circle cx="4" cy="4" r="3.5" fill="white" stroke="var(--gray-400)"/>
						</marker>
					</defs>
					<g id="connectors" fill="none">
					</g>
				</svg>
				<div id="hierarchy-chart">
				</div>
			</div>`)
  }
  render_root_nodes(this: any, expanded_view: any = false) {
    let me = this
    return frappe
      .call({
        method: me.method,
        args: {
          company: me.company,
        },
      })
      .then((r: any) => {
        if (r.message.length) {
          me.page.body.find('#hierarchy-empty-root').remove()
          me.set_main_state('hierarchy-main-chart')
          let expand_node: any
          let node: any
          $.each(r.message, (_i: any, data: any) => {
            if ($(`[id="${data.id}"]`).length) return
            node = new me.Node({
              id: data.id,
              parent: $('<li class="child-node"></li>').appendTo(me.$hierarchy.find('.node-children')),
              parent_id: '',
              image: data.image,
              name: data.name,
              title: data.title,
              expandable: true,
              connections: data.connections,
              is_root: true,
            })
            if (!expand_node && data.connections) expand_node = node
          })
          me.root_node = expand_node
          if (!expanded_view) {
            me.expand_node(expand_node)
          }
        }
      })
  }
  expand_node(this: any, node: any) {
    const is_sibling = this.selected_node && this.selected_node.parent_id === node.parent_id
    this.set_selected_node(node)
    this.show_active_path(node)
    this.collapse_previous_level_nodes(node)
    if (!is_sibling) {
      this.refresh_connectors(node.parent_id)
      let grandparent = $(`[id="${node.parent_id}"]`).attr('data-parent')
      this.refresh_connectors(grandparent)
    }
    if (node.expandable && !node.expanded) {
      return this.load_children(node)
    }
  }
  collapse_node(this: any) {
    if (this.selected_node.expandable) {
      this.selected_node.$children.hide()
      $(`path[data-parent="${this.selected_node.id}"]`).hide()
      this.selected_node.expanded = false
    }
  }
  show_active_path(node: any) {
    $(`[id="${node.parent_id}"]`).addClass('active-path')
  }
  load_children(this: any, node: any, deep: any = false) {
    if (!this.company) {
      frappe.throw(__('Please select a company first.'))
    }
    if (!deep) {
      frappe.run_serially([
        () => this.get_child_nodes(node.id),
        (child_nodes: any) => this.render_child_nodes(node, child_nodes),
      ])
    } else {
      frappe.run_serially([
        () => frappe.dom.freeze(),
        () => this.setup_hierarchy(),
        () => this.render_root_nodes(true),
        () => this.get_all_nodes(),
        (data_list: any) => this.render_children_of_all_nodes(data_list),
        () => frappe.dom.unfreeze(),
      ])
    }
  }
  get_child_nodes(this: any, node_id: any) {
    let me = this
    return new Promise((resolve: any) => {
      frappe
        .call({
          method: me.method,
          args: {
            parent: node_id,
            company: me.company,
          },
        })
        .then((r: any) => resolve(r.message))
    })
  }
  render_child_nodes(this: any, node: any, child_nodes: any) {
    const last_level = this.$hierarchy.find('.level:last').index()
    const current_level = $(`[id="${node.id}"]`).parent().parent().parent().index()
    if (last_level === current_level) {
      this.$hierarchy.append(`
				<li class="level"></li>
			`)
    }
    if (!node.$children) {
      node.$children = $('<ul class="node-children"></ul>').hide().appendTo(this.$hierarchy.find('.level:last'))
      node.$children.empty()
      if (child_nodes) {
        $.each(child_nodes, (_i: any, data: any) => {
          if (!$(`[id="${data.id}"]`).length) {
            this.add_node(node, data)
            setTimeout(() => {
              this.add_connector(node.id, data.id)
            }, 250)
          }
        })
      }
    }
    node.$children.show()
    $(`path[data-parent="${node.id}"]`).show()
    node.expanded = true
  }
  get_all_nodes(this: any) {
    let me = this
    return new Promise((resolve: any) => {
      frappe.call({
        method: 'hrms.utils.hierarchy_chart.get_all_nodes',
        args: {
          method: me.method,
          company: me.company,
        },
        callback: (r: any) => {
          resolve(r.message)
        },
      })
    })
  }
  render_children_of_all_nodes(this: any, data_list: any) {
    let entry: any
    let node: any
    while (data_list.length) {
      entry = data_list.shift()
      node = this.nodes[entry.parent]
      if (node) {
        this.render_child_nodes_for_expanded_view(node, entry.data)
      } else if (data_list.length) {
        data_list.push(entry)
      }
    }
  }
  render_child_nodes_for_expanded_view(this: any, node: any, child_nodes: any) {
    node.$children = $('<ul class="node-children"></ul>')
    const last_level = this.$hierarchy.find('.level:last').index()
    const node_level = $(`[id="${node.id}"]`).parent().parent().parent().index()
    if (last_level === node_level) {
      this.$hierarchy.append(`
				<li class="level"></li>
			`)
      node.$children.appendTo(this.$hierarchy.find('.level:last'))
    } else {
      node.$children.appendTo(this.$hierarchy.find('.level:eq(' + (node_level + 1) + ')'))
    }
    node.$children.hide().empty()
    if (child_nodes) {
      $.each(child_nodes, (_i: any, data: any) => {
        this.add_node(node, data)
        setTimeout(() => {
          this.add_connector(node.id, data.id)
        }, 250)
      })
    }
    node.$children.show()
    $(`path[data-parent="${node.id}"]`).show()
    node.expanded = true
    if (child_nodes && child_nodes.length > 1) {
      const extra = (child_nodes.length - 1) * 88
      node.$link.closest('.child-node').css('margin-bottom', extra + 'px')
    }
  }
  add_node(this: any, node: any, data: any) {
    return new this.Node({
      id: data.id,
      parent: $('<li class="child-node"></li>').appendTo(node.$children),
      parent_id: node.id,
      image: data.image,
      name: data.name,
      title: data.title,
      expandable: data.expandable,
      connections: data.connections,
      children: null,
    })
  }
  add_connector(this: any, parent_id: any, child_id: any) {
    const parent_node = document.getElementById(`${parent_id}`)
    const child_node = document.getElementById(`${child_id}`)
    let path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const pos_parent_right: any = {
      x: (parent_node as any).offsetLeft + (parent_node as any).offsetWidth,
      y: (parent_node as any).offsetTop + (parent_node as any).offsetHeight / 2,
    }
    const pos_child_left: any = {
      x: (child_node as any).offsetLeft - 5,
      y: (child_node as any).offsetTop + (child_node as any).offsetHeight / 2,
    }
    const connector = this.get_connector(pos_parent_right, pos_child_left)
    path.setAttribute('d', connector)
    this.set_path_attributes(path, parent_id, child_id)(document.getElementById('connectors') as any).appendChild(path)
  }
  get_connector(pos_parent_right: any, pos_child_left: any) {
    if (pos_parent_right.y === pos_child_left.y) {
      return 'M' + pos_parent_right.x + ',' + pos_parent_right.y + ' ' + 'L' + pos_child_left.x + ',' + pos_child_left.y
    } else {
      let arc_1 = ''
      let arc_2 = ''
      let offset = 0
      if (pos_parent_right.y > pos_child_left.y) {
        arc_1 = 'a10,10 1 0 0 10,-10 '
        arc_2 = 'a10,10 0 0 1 10,-10 '
        offset = 10
      } else {
        arc_1 = 'a10,10 0 0 1 10,10 '
        arc_2 = 'a10,10 1 0 0 10,10 '
        offset = -10
      }
      return (
        'M' +
        pos_parent_right.x +
        ',' +
        pos_parent_right.y +
        ' ' +
        'L' +
        (pos_parent_right.x + 40) +
        ',' +
        pos_parent_right.y +
        ' ' +
        arc_1 +
        'L' +
        (pos_parent_right.x + 50) +
        ',' +
        (pos_child_left.y + offset) +
        ' ' +
        arc_2 +
        'L' +
        pos_child_left.x +
        ',' +
        pos_child_left.y
      )
    }
  }
  set_path_attributes(path: any, parent_id: any, child_id: any) {
    path.setAttribute('data-parent', parent_id)
    path.setAttribute('data-child', child_id)
    const parent = $(`[id="${parent_id}"]`)
    if (parent.hasClass('active')) {
      path.setAttribute('class', 'active-connector')
      path.setAttribute('marker-start', 'url(#arrowstart-active)')
      path.setAttribute('marker-end', 'url(#arrowhead-active)')
    } else {
      path.setAttribute('class', 'collapsed-connector')
      path.setAttribute('marker-start', 'url(#arrowstart-collapsed)')
      path.setAttribute('marker-end', 'url(#arrowhead-collapsed)')
    }
  }
  set_selected_node(this: any, node: any) {
    if (this.selected_node) this.selected_node.$link.removeClass('active')
    this.selected_node = node
    node.$link.addClass('active')
  }
  collapse_previous_level_nodes(node: any) {
    let node_parent = $(`[id="${node.parent_id}"]`)
    let previous_level_nodes = node_parent.parent().parent().children('li')
    let node_card: any
    previous_level_nodes.each(function (this: any) {
      node_card = $(this).find('.node-card')
      if (!node_card.hasClass('active-path')) {
        node_card.addClass('collapsed')
      }
    })
  }
  refresh_connectors(this: any, node_parent: any) {
    if (!node_parent) return
    $(`path[data-parent="${node_parent}"]`).remove()
    frappe.run_serially([
      () => this.get_child_nodes(node_parent),
      (child_nodes: any) => {
        if (child_nodes) {
          $.each(child_nodes, (_i: any, data: any) => {
            this.add_connector(node_parent, data.id)
          })
        }
      },
    ])
  }
  setup_node_click_action(this: any, node: any) {
    let me = this
    let node_element = $(`[id="${node.id}"]`)
    node_element.click(function () {
      const is_sibling = me.selected_node.parent_id === node.parent_id
      if (is_sibling) {
        me.collapse_node()
      } else if (
        node_element.is(':visible') &&
        (node_element.hasClass('collapsed') || node_element.hasClass('active-path'))
      ) {
        me.remove_levels_after_node(node)
        me.remove_orphaned_connectors()
      }
      me.expand_node(node)
    })
  }
  setup_edit_node_action(this: any, node: any) {
    let node_element = $(`[id="${node.id}"]`)
    let me = this
    node_element.find('.btn-edit-node').click(function () {
      frappe.set_route('Form', me.doctype, node.id)
    })
  }
  remove_levels_after_node(this: any, node: any) {
    let level = $(`[id="${node.id}"]`).parent().parent().parent().index()
    level = $('.hierarchy > li:eq(' + level + ')')
    level.nextAll('li').remove()
    let nodes = level.find('.node-card')
    let node_object: any
    $.each(nodes, (_i: any, element: any) => {
      node_object = this.nodes[element.id]
      node_object.expanded = 0
      node_object.$children = null
    })
    nodes.removeClass('collapsed active-path')
  }
  remove_orphaned_connectors() {
    let paths = $('#connectors > path')
    $.each(paths, (_i: any, path: any) => {
      const parent = $(path).data('parent')
      const child = $(path).data('child')
      if ($(`[id="${parent}"]`).length && $(`[id="${child}"]`).length) return
      $(path).remove()
    })
  }
}
