frappe.query_reports["Maintenance Summary"] = {
	filters: [
		{
			fieldname: "property",
			label: __("Property"),
			fieldtype: "Link",
			options: "Property",
		},
		{
			fieldname: "category",
			label: __("Category"),
			fieldtype: "Select",
			options: "\nPlumbing\nElectrical\nHVAC\nCleaning\nSecurity\nLifts and Escalators\nFire Safety\nStructural\nSignage\nPest Control\nIT and Network\nOther",
		},
		{
			fieldname: "from_date",
			label: __("From"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -3),
		},
		{
			fieldname: "to_date",
			label: __("To"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
		}
	],
};
