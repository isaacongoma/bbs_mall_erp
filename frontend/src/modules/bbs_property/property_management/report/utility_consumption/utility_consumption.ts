import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Utility Consumption'] = {
  filters: [
    {
      fieldname: "property",
      label: __("Property"),
      fieldtype: "Link",
      options: "Property",
    },
    {
      fieldname: "utility_type",
      label: __("Utility"),
      fieldtype: "Select",
      options: "\nElectricity\nWater\nGas\nCooling\nOther",
    },
    {
      fieldname: "from_date",
      label: __("From"),
      fieldtype: "Date",
      default: frappe.datetime.add_months(frappe.datetime.month_start(), -5),
    },
    {
      fieldname: "to_date",
      label: __("To"),
      fieldtype: "Date",
      default: frappe.datetime.month_end(),
    }
  ],
}
