import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Tenant Statement'] = {
  filters: [
    {
      fieldname: "customer",
      label: __("Tenant"),
      fieldtype: "Link",
      options: "Customer",
      reqd: 1,
    },
    {
      fieldname: "from_date",
      label: __("From"),
      fieldtype: "Date",
      default: frappe.datetime.add_months(frappe.datetime.get_today(), -6),
    },
    {
      fieldname: "to_date",
      label: __("To"),
      fieldtype: "Date",
      default: frappe.datetime.get_today(),
    }
  ],
}
