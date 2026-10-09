import { frappe } from '@/shared/frappe/runtime'

frappe.views.ReportFactory = class ReportFactory extends frappe.views.Factory {
  [key: string]: any
  make(route: any) {
    const _route: any = ['List', route[1], 'Report']
    if (route[2]) {
      _route.push(route[2])
    }
    frappe.set_route(_route)
  }
}
