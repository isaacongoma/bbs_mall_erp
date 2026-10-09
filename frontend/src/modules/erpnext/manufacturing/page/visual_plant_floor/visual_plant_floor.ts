import { $, frappe } from '@/shared/frappe'
frappe.pages['visual-plant-floor'].on_page_load = function (wrapper?: any) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Visual Plant Floor',
    single_column: true,
  })
  frappe.visual_plant_floor = new frappe.ui.VisualPlantFloor(
    { wrapper: $(wrapper).find('.layout-main-section') },
    wrapper.page,
  )
}
