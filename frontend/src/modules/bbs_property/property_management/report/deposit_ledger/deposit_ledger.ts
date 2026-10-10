import { __, frappe } from '@/shared/frappe'

frappe.query_reports['Deposit Ledger'] = {
  filters: [
    {
      fieldname: "company",
      label: __("Company"),
      fieldtype: "Link",
      options: "Company",
      default: frappe.defaults.get_user_default('Company'),
    },
    {
      fieldname: "property",
      label: __("Property"),
      fieldtype: "Link",
      options: "Property",
    },
    {
      fieldname: "customer",
      label: __("Tenant"),
      fieldtype: "Link",
      options: "Customer",
    },
    {
      fieldname: "only_with_balance",
      label: __("Only Leases Holding a Deposit"),
      fieldtype: "Check",
    }
  ],
}
