app_name = "hrms"
app_title = "Frappe HR"
app_publisher = "Frappe Technologies Pvt. Ltd."
app_description = "Modern HR and Payroll Software"
app_email = "contact@frappe.io"
app_license = "GNU General Public License (v3)"
required_apps = ["frappe/erpnext"]
after_install = "hrms.install.after_install"
after_migrate = "hrms.setup.update_select_perm_after_install"
calendars = ["Leave Application"]
website_generators = ["Job Opening"]
has_upload_permission = {"Employee": "erpnext.setup.doctype.employee.employee.has_upload_permission"}
override_doctype_class = {
    "Employee": "hrms.overrides.employee_master.EmployeeMaster",
    "Timesheet": "hrms.overrides.employee_timesheet.EmployeeTimesheet",
    "Payment Entry": "hrms.overrides.employee_payment_entry.EmployeePaymentEntry",
    "Project": "hrms.overrides.employee_project.EmployeeProject",
}
doc_events = {
    "User": {
        "validate": [
            "erpnext.setup.doctype.employee.employee.validate_employee_role",
            "hrms.overrides.employee_master.update_approver_user_roles",
        ],
    },
    "Company": {
        "validate": "hrms.overrides.company.validate_default_accounts",
        "on_update": [
            "hrms.overrides.company.make_company_fixtures",
            "hrms.overrides.company.set_default_hr_accounts",
            "hrms.overrides.company.set_expense_claim_type_accounts",
        ],
        "on_trash": "hrms.overrides.company.handle_linked_docs",
    },
    "Holiday List": {
        "on_update": "hrms.utils.holiday_list.invalidate_cache",
        "on_trash": "hrms.utils.holiday_list.invalidate_cache",
    },
    "Timesheet": {"validate": "hrms.hr.utils.validate_active_employee"},
    "Payment Entry": {
        "on_submit": "hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim",
        "on_cancel": "hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim",
        "on_update_after_submit": "hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim",
    },
    "Unreconcile Payment": {
        "on_submit": "hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim",
    },
    "Journal Entry": {
        "validate": "hrms.hr.doctype.expense_claim.expense_claim.validate_expense_claim_in_jv",
        "on_submit": [
            "hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim",
            "hrms.hr.doctype.full_and_final_statement.full_and_final_statement.update_full_and_final_statement_status",
            "hrms.payroll.doctype.salary_withholding.salary_withholding.update_salary_withholding_payment_status",
        ],
        "on_update_after_submit": "hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim",
        "on_cancel": [
            "hrms.hr.doctype.expense_claim.expense_claim.update_payment_for_expense_claim",
            "hrms.payroll.doctype.salary_slip.salary_slip.unlink_ref_doc_from_salary_slip",
            "hrms.hr.doctype.full_and_final_statement.full_and_final_statement.update_full_and_final_statement_status",
            "hrms.payroll.doctype.salary_withholding.salary_withholding.update_salary_withholding_payment_status",
        ],
    },
    "Loan": {"validate": "hrms.hr.utils.validate_loan_repay_from_salary"},
    "Employee": {
        "validate": "hrms.overrides.employee_master.validate_onboarding_process",
        "on_update": [
            "hrms.overrides.employee_master.update_approver_role",
            "hrms.overrides.employee_master.publish_update",
        ],
        "after_insert": [
            "hrms.overrides.employee_master.update_job_applicant_and_offer",
        ],
        "on_trash": "hrms.overrides.employee_master.update_employee_transfer",
        "after_delete": "hrms.overrides.employee_master.publish_update",
    },
    "Project": {"validate": "hrms.controllers.employee_boarding_controller.update_employee_boarding_status"},
    "Task": {"on_update": "hrms.controllers.employee_boarding_controller.update_task"},
    "Leave Application": {"on_submit": "hrms.telemetry.on_leave_application_submit"},
    "Expense Claim": {"on_submit": "hrms.telemetry.on_expense_claim_submit"},
    "Attendance Request": {"on_submit": "hrms.telemetry.on_attendance_request_submit"},
    "Shift Request": {"on_submit": "hrms.telemetry.on_shift_request_submit"},
    "Employee Checkin": {"after_insert": "hrms.telemetry.on_employee_checkin"},
    "Payroll Entry": {"on_submit": "hrms.telemetry.on_payroll_entry_submit"},
    "Job Offer": {"on_submit": "hrms.telemetry.on_job_offer_submit"},
    "Appraisal": {"on_submit": "hrms.telemetry.on_appraisal_submit"},
    "Interview": {"on_submit": "hrms.telemetry.on_interview_submit"},
    "Shift Type": {"after_insert": "hrms.telemetry.on_milestone_insert"},
    "Leave Type": {"after_insert": "hrms.telemetry.on_milestone_insert"},
    "Salary Structure": {"after_insert": "hrms.telemetry.on_milestone_insert"},
    "Job Opening": {"after_insert": "hrms.telemetry.on_milestone_insert"},
    "Appraisal Cycle": {"after_insert": "hrms.telemetry.on_milestone_insert"},
    "Employee Onboarding": {"after_insert": "hrms.telemetry.on_milestone_insert"},
    "Salary Slip": {"on_submit": "hrms.telemetry.on_milestone_submit"},
}
scheduler_events = {
    "all": ["hrms.hr.doctype.interview.interview.send_interview_reminder"],
    "hourly_long": [
        "hrms.hr.doctype.shift_type.shift_type.update_last_sync_of_checkin",
        "hrms.hr.doctype.shift_type.shift_type.process_auto_attendance_for_all_shifts",
        "hrms.hr.doctype.shift_schedule_assignment.shift_schedule_assignment.process_auto_shift_creation",
    ],
    "daily": [
        "hrms.controllers.employee_reminders.send_birthday_reminders",
        "hrms.controllers.employee_reminders.send_work_anniversary_reminders",
        "hrms.hr.doctype.interview.interview.send_daily_feedback_reminder",
        "hrms.hr.doctype.shift_assignment.shift_assignment.mark_expired_shift_assignments_as_inactive",
        "hrms.hr.doctype.job_opening.job_opening.close_expired_job_openings",
    ],
    "daily_long": [
        "hrms.hr.doctype.leave_ledger_entry.leave_ledger_entry.process_expired_allocation",
        "hrms.hr.utils.generate_leave_encashment",
        "hrms.hr.utils.allocate_earned_leaves",
    ],
    "weekly": ["hrms.controllers.employee_reminders.send_reminders_in_advance_weekly"],
    "monthly": ["hrms.controllers.employee_reminders.send_reminders_in_advance_monthly"],
}
advance_payment_payable_doctypes = ["Leave Encashment", "Gratuity", "Employee Advance"]
invoice_doctypes = ["Expense Claim"]
period_closing_doctypes = ["Payroll Entry"]
accounting_dimension_doctypes = [
    "Expense Claim",
    "Expense Claim Detail",
    "Expense Taxes and Charges",
    "Payroll Entry",
    "Leave Encashment",
]
bank_reconciliation_doctypes = ["Expense Claim"]
audit_trail_doctypes = ["Expense Claim", "Payroll Entry", "Salary Slip", "Leave Encashment", "Gratuity"]
before_tests = "hrms.tests.test_utils.before_tests"
get_matching_queries = "hrms.hr.utils.get_matching_queries"
override_doctype_dashboards = {
    "Employee": "hrms.overrides.dashboard_overrides.get_dashboard_for_employee",
    "Holiday List": "hrms.overrides.dashboard_overrides.get_dashboard_for_holiday_list",
    "Task": "hrms.overrides.dashboard_overrides.get_dashboard_for_project",
    "Project": "hrms.overrides.dashboard_overrides.get_dashboard_for_project",
    "Timesheet": "hrms.overrides.dashboard_overrides.get_dashboard_for_timesheet",
    "Bank Account": "hrms.overrides.dashboard_overrides.get_dashboard_for_bank_account",
}
ignore_links_on_delete = ["PWA Notification"]
company_data_to_be_ignored = [
    "Salary Component Account",
    "Salary Structure",
    "Salary Structure Assignment",
    "Payroll Period",
    "Income Tax Slab",
    "Leave Period",
    "Leave Policy Assignment",
    "Employee Onboarding Template",
    "Employee Separation Template",
]
ignore_translatable_strings_from = ["frappe", "erpnext"]
employee_holiday_list = ["hrms.utils.holiday_list.get_holiday_list_for_employee"]
repost_allowed_doctypes = ["Expense Claim"]