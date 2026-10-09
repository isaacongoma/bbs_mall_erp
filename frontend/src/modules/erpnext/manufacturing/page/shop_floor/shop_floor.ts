import { $, __, frappe } from '@/shared/frappe'
frappe.pages['shop-floor'].on_page_load = function (wrapper?: any) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: __('Shop Floor'),
    single_column: true,
    hide_sidebar: true,
  })
  frappe.shop_floor = new frappe.ui.ShopFloor({ wrapper: $(wrapper).find('.layout-main-section') }, wrapper.page)
}
frappe.pages['shop-floor'].on_page_show = function () {
  $(document.body).addClass('shop-floor-active')
  if (frappe.shop_floor && frappe.shop_floor.on_show) {
    frappe.shop_floor.on_show()
  }
}
