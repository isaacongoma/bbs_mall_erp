app_name = "bbs_property"
app_title = "Property Management"
app_publisher = "BBS Mall"
app_description = "Leasing, tenant billing, utilities, maintenance and tenant portal for BBS Mall"
app_email = "info@bbsmall.co.ke"
app_license = "Proprietary"
required_apps = ["frappe/erpnext"]
app_home = "/desk/property-management"
app_logo_url = "/assets/bbs_property/images/property-logo.svg"

add_to_apps_screen = [
    {
        "name": app_name,
        "logo": "/assets/bbs_property/images/property-logo.svg",
        "title": app_title,
        "route": app_home,
        "has_permission": "bbs_property.check_app_permission",
        "sequence_id": 3,
    }
]

after_install = "bbs_property.setup.after_install"
after_migrate = "bbs_property.setup.after_migrate"

code_only_modules = {}

doc_events = {
    "Sales Invoice": {
        "on_submit": "bbs_property.property_management.billing.refresh_lease_for_invoice",
        "on_cancel": "bbs_property.property_management.billing.refresh_lease_for_invoice",
        "on_update_after_submit": "bbs_property.property_management.billing.refresh_lease_for_invoice",
    },
    "Payment Entry": {
        "on_submit": "bbs_property.property_management.billing.refresh_leases_for_payment",
        "on_cancel": "bbs_property.property_management.billing.refresh_leases_for_payment",
    },
    "Customer": {
        "after_insert": "bbs_property.property_management.portal.sync_portal_users",
        "on_update": "bbs_property.property_management.portal.sync_portal_users",
    },
}

scheduler_events = {
    "hourly": ["bbs_property.property_management.mpesa.expire_pending_payments"],
    "daily": [
        "bbs_property.property_management.lease_jobs.update_lease_statuses",
        "bbs_property.property_management.lease_jobs.generate_due_invoices",
        "bbs_property.property_management.lease_jobs.apply_late_fees",
        "bbs_property.property_management.lease_jobs.send_payment_reminders",
        "bbs_property.property_management.lease_jobs.send_lease_expiry_alerts",
        "bbs_property.property_management.lease_jobs.publish_scheduled_notices",
        "bbs_property.property_management.lease_jobs.refresh_property_metrics",
    ],
}

override_doctype_dashboards = {
    "Customer": "bbs_property.property_management.dashboards.customer_dashboard",
}
