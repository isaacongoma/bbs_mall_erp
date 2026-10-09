import { $, __, frappe } from '@/shared/frappe'
frappe.ui.form.on('Plant Floor', {
  setup(frm?: any) {
    frm.trigger('setup_queries')
  },
  add_workstation(frm?: any) {
    frm
      .add_custom_button(__('Create Workstation'), () => {
        const doc = frappe.model.get_new_doc('Workstation')
        doc.plant_floor = frm.doc.name
        doc.status = 'Off'
        frappe.ui.form.make_quick_entry(
          'Workstation',
          () => {
            frm.trigger('prepare_workstation_dashboard')
          },
          null,
          doc,
        )
      })
      .addClass('btn-primary')
  },
  setup_queries(frm?: any) {
    frm.set_query('warehouse', (doc?: any) => {
      if (!doc.company) {
        frappe.throw(__('Please select Company first'))
      }
      return {
        filters: {
          is_group: 0,
          company: doc.company,
        },
      }
    })
  },
  refresh(frm?: any) {
    frm.trigger('prepare_stock_dashboard')
    frm.trigger('prepare_workstation_dashboard')
    frm.trigger('update_realtime_status')
    if (!frm.is_new()) {
      frm.trigger('add_workstation')
      frm.disable_save()
    }
  },
  prepare_workstation_dashboard(frm?: any) {
    const wrapper = $(frm.fields_dict['plant_dashboard'].wrapper)
    wrapper.empty()
    frappe.visual_plant_floor = new frappe.ui.VisualPlantFloor({
      wrapper: wrapper,
      skip_filters: true,
      plant_floor: frm.doc.name,
    })
  },
  update_realtime_status() {
    frappe.realtime.on('update_workstation_status', (data?: any) => {
      frappe.visual_plant_floor.update_status(data)
    })
  },
  prepare_stock_dashboard(frm?: any) {
    if (!frm.doc.warehouse) {
      return
    }
    const wrapper = $(frm.fields_dict['stock_summary'].wrapper)
    wrapper.empty()
    frappe.visual_stock = new VisualStock({
      wrapper: wrapper,
      frm: frm,
    })
  },
})
class VisualStock {
  [key: string]: any
  constructor(opts?: any) {
    Object.assign(this, opts)
    this.make()
  }
  make(this: any) {
    this.prepare_filters()
    this.prepare_stock_summary({
      start: 0,
    })
  }
  prepare_filters(this: any) {
    this.wrapper.append(`
			<div class="row">
				<div class="col-sm-12 filter-section section-body">

				</div>
			</div>
		`)
    this.item_filter = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Link',
        fieldname: 'item_code',
        placeholder: __('Item'),
        options: 'Item',
        onchange: () =>
          this.prepare_stock_summary({
            start: 0,
            item_code: this.item_filter.value,
          }),
      },
      parent: this.wrapper.find('.filter-section'),
      render_input: true,
    })
    this.item_filter.$wrapper.addClass('form-column col-sm-3')
    this.item_filter.$wrapper.find('.clearfix').hide()
    this.item_group_filter = frappe.ui.form.make_control({
      df: {
        fieldtype: 'Link',
        fieldname: 'item_group',
        placeholder: __('Item Group'),
        options: 'Item Group',
        change: () =>
          this.prepare_stock_summary({
            start: 0,
            item_group: this.item_group_filter.value,
          }),
      },
      parent: this.wrapper.find('.filter-section'),
      render_input: true,
    })
    this.item_group_filter.$wrapper.addClass('form-column col-sm-3')
    this.item_group_filter.$wrapper.find('.clearfix').hide()
  }
  prepare_stock_summary(this: any, args?: any) {
    const { start, item_code, item_group } = args
    this.get_stock_summary(start, item_code, item_group).then((stock_summary?: any) => {
      this.wrapper.find('.stock-summary-container').remove()
      this.wrapper.append(`<div class="col-sm-12 stock-summary-container" style="margin-bottom:20px"></div>`)
      this.stock_summary = stock_summary.message
      this.render_stock_summary()
      this.bind_events()
    })
  }
  async get_stock_summary(this: any, start?: any, item_code?: any, item_group?: any) {
    const stock_summary = await frappe.call({
      method: 'erpnext.manufacturing.doctype.plant_floor.plant_floor.get_stock_summary',
      args: {
        warehouse: this.frm.doc.warehouse,
        start: start,
        item_code: item_code,
        item_group: item_group,
      },
    })
    return stock_summary
  }
  render_stock_summary(this: any) {
    const template = frappe.render_template('stock_summary_template', {
      stock_summary: this.stock_summary,
    })
    this.wrapper.find('.stock-summary-container').append(template)
  }
  bind_events(this: any) {
    this.wrapper.find('.btn-add').click((e?: any) => {
      this.item_code = decodeURI($(e.currentTarget).attr('data-item-code') as string)
      this.make_stock_entry(
        [
          {
            label: __('For Item'),
            fieldname: 'item_code',
            fieldtype: 'Data',
            read_only: 1,
            default: this.item_code,
          },
          {
            label: __('Quantity'),
            fieldname: 'qty',
            fieldtype: 'Float',
            reqd: 1,
          },
        ],
        __('Add Stock'),
        'Material Receipt',
      )
    })
    this.wrapper.find('.btn-move').click((e?: any) => {
      this.item_code = decodeURI($(e.currentTarget).attr('data-item-code') as string)
      this.make_stock_entry(
        [
          {
            label: __('For Item'),
            fieldname: 'item_code',
            fieldtype: 'Data',
            read_only: 1,
            default: this.item_code,
          },
          {
            label: __('Quantity'),
            fieldname: 'qty',
            fieldtype: 'Float',
            reqd: 1,
          },
          {
            label: __('To Warehouse'),
            fieldname: 'to_warehouse',
            fieldtype: 'Link',
            options: 'Warehouse',
            reqd: 1,
            get_query: () => {
              return {
                filters: {
                  is_group: 0,
                  company: this.frm.doc.company,
                },
              }
            },
          },
        ],
        __('Move Stock'),
        'Material Transfer',
      )
    })
  }
  make_stock_entry(this: any, fields?: any, title?: any, stock_entry_type?: any) {
    frappe.prompt(
      fields,
      (values?: any) => {
        this.values = values
        this.stock_entry_type = stock_entry_type
        this.update_values()
        this.frm.call({
          method: 'make_stock_entry',
          doc: this.frm.doc,
          args: {
            kwargs: this.values,
          },
          callback: (r?: any) => {
            if (!r.exc) {
              frappe.model.sync(r.message)
              frappe.set_route('Form', r.message.doctype, r.message.name)
            }
          },
        })
      },
      __(title),
      __('Create'),
    )
  }
  update_values(this: any) {
    if (!this.values.qty) {
      frappe.throw(__('Quantity is required'))
    }
    let from_warehouse = ''
    let to_warehouse = ''
    if (this.stock_entry_type == 'Material Receipt') {
      to_warehouse = this.frm.doc.warehouse
    } else {
      from_warehouse = this.frm.doc.warehouse
      to_warehouse = this.values.to_warehouse
    }
    this.values = {
      ...this.values,
      ...{
        company: this.frm.doc.company,
        item_code: this.item_code,
        from_warehouse: from_warehouse,
        to_warehouse: to_warehouse,
        purpose: this.stock_entry_type,
      },
    }
  }
}
