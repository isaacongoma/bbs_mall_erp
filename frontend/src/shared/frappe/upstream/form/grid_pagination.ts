import { $, __, frappe } from '@/shared/frappe/runtime'
export default class GridPagination {
  [key: string]: any
  constructor(opts?: any) {
    $.extend(this, opts)
    this.setup_pagination()
  }
  setup_pagination(this: any) {
    this.page_length = this.grid.meta?.grid_page_length || 50
    this.page_index = 1
    this.total_pages = Math.ceil(this.grid.data.length / this.page_length)
    this.render_pagination()
  }
  render_pagination(this: any) {
    if (this.grid.data.length <= this.page_length) {
      this.wrapper.find('.grid-pagination').html('')
    } else {
      let $pagination_template = this.get_pagination_html()
      this.wrapper.find('.grid-pagination').html($pagination_template)
      this.prev_page_button = this.wrapper.find('.prev-page')
      this.next_page_button = this.wrapper.find('.next-page')
      this.$page_number = this.wrapper.find('.current-page-number')
      this.$total_pages = this.wrapper.find('.total-page-number')
      this.first_page_button = this.wrapper.find('.first-page')
      this.last_page_button = this.wrapper.find('.last-page')
      this.bind_pagination_events()
    }
  }
  bind_pagination_events(this: any) {
    this.prev_page_button.on('click', () => {
      this.render_prev_page()
    })
    this.next_page_button.on('click', () => {
      this.render_next_page()
    })
    this.first_page_button.on('click', () => {
      this.go_to_page(1)
    })
    this.last_page_button.on('click', () => {
      this.go_to_page(this.total_pages)
    })
    this.$page_number.on('keyup', (e?: any) => {
      e.currentTarget.style.width = (e.currentTarget.value.length + 1) * 8 + 'px'
    })
    this.$page_number.on('keydown', (e?: any) => {
      e = e ? e : window.event
      let charCode = e.which ? e.which : e.keyCode
      let arrow: any = { up: 38, down: 40 }
      switch (charCode) {
        case arrow.up:
          this.inc_dec_number(true)
          break
        case arrow.down:
          this.inc_dec_number(false)
          break
      }
      if (charCode > 31 && (charCode < 48 || charCode > 57) && ![37, 38, 39, 40].includes(charCode)) {
        return false
      }
      return true
    })
    this.$page_number.on('focusout', (e?: any) => {
      if (this.page_index == e.currentTarget.value) return
      this.page_index = e.currentTarget.value
      if (this.page_index < 1) {
        this.page_index = 1
      } else if (this.page_index > this.total_pages) {
        this.page_index = this.total_pages
      }
      this.go_to_page()
    })
  }
  inc_dec_number(this: any, increment?: any) {
    let new_value = parseInt(String(this.$page_number.val()))
    increment ? new_value++ : new_value--
    if (new_value < 1 || new_value > this.total_pages) return
    this.$page_number.val(new_value)
  }
  update_page_numbers(this: any) {
    let total_pages = Math.ceil(this.grid.data.length / this.page_length)
    if (this.total_pages !== total_pages) {
      this.total_pages = total_pages
      this.render_pagination()
    }
  }
  check_page_number(this: any) {
    if (this.page_index > this.total_pages && this.page_index > 1) {
      this.go_to_page(this.page_index - 1)
    }
  }
  get_pagination_html(this: any) {
    let page_text_html = `<div class="page-text">
				<input class="current-page-number page-number" type="text" value="${__(this.page_index)}"/>
				<span>${__('of')}</span>
				<span class="total-page-number page-number"> ${__(this.total_pages)} </span>
			</div>`
    return $(`${frappe.ui.button.html({
      label: __('First'),
      size: 'sm',
      css_class: 'first-page',
    })}
			${frappe.ui.button.html({
        icon: 'chevron-left',
        title: __('Previous page'),
        size: 'sm',
        css_class: 'prev-page',
      })}
			${page_text_html}
			${frappe.ui.button.html({
        icon: 'chevron-right',
        title: __('Next page'),
        size: 'sm',
        css_class: 'next-page',
      })}
			${frappe.ui.button.html({
        label: __('Last'),
        size: 'sm',
        css_class: 'last-page',
      })}`)
  }
  render_next_page(this: any) {
    if (this.page_index * this.page_length < this.grid.data.length) {
      this.page_index++
      this.go_to_page()
    }
  }
  render_prev_page(this: any) {
    if (this.page_index > 1) {
      this.page_index--
      this.go_to_page()
    }
  }
  go_to_page(this: any, index?: any, from_refresh?: any) {
    if (!index) {
      index = this.page_index
    } else {
      this.page_index = index
    }
    this.grid.render_result_rows()
    if (this.$page_number) {
      this.$page_number.val(index)
      this.$page_number.css('width', (index.toString().length + 1) * 8 + 'px')
    }
    this.update_page_numbers()
    if (!from_refresh) {
      this.update_select_all_checkbox()
      this.grid.scroll_to_top()
    }
  }
  update_select_all_checkbox(this: any) {
    const start_index = (this.page_index - 1) * this.page_length
    const result_length = this.get_result_length()
    const all_selected =
      result_length > 0 && this.grid.data.slice(start_index, result_length).every((row?: any) => row.__checked)
    this.wrapper.find('.grid-heading-row .grid-row-check').prop('checked', all_selected)
  }
  go_to_last_page_to_add_row(this: any) {
    let total_pages = this.total_pages
    let page_length = this.page_length
    if (this.grid.data.length == page_length * total_pages) {
      this.go_to_page(total_pages + 1)
      frappe.utils.scroll_to(this.wrapper)
    } else if (this.page_index == this.total_pages) {
      return
    } else {
      this.go_to_page(total_pages)
    }
  }
  get_result_length(this: any) {
    return this.grid.data.length < this.page_index * this.page_length
      ? this.grid.data.length
      : this.page_index * this.page_length
  }
}
