doc_events = {
    "Customer": {"validate": "erpnext.regional.kenya.utils.validate_kra_pin"},
    "Supplier": {"validate": "erpnext.regional.kenya.utils.validate_kra_pin"},
    "Company": {"validate": "erpnext.regional.kenya.utils.validate_kra_pin"},
    "Sales Invoice": {
        "on_submit": "erpnext.erpnext_integrations.etims.service.on_submit_invoice",
        "before_cancel": "erpnext.erpnext_integrations.etims.service.before_cancel_invoice",
    },
    "Purchase Invoice": {
        "on_submit": "erpnext.erpnext_integrations.etims.service.on_submit_invoice",
        "before_cancel": "erpnext.erpnext_integrations.etims.service.before_cancel_invoice",
    },
    "Salary Slip": {"before_validate": "hrms.regional.kenya.utils.set_company_region"},
}

scheduler_events = {
    "hourly": ["erpnext.erpnext_integrations.etims.service.retry_failed_submissions"],
}
