import frappe
from frappe import _
from frappe.utils import add_days, getdate

from erpnext.stock.utils import get_combine_datetime


def execute(filters=None):
    filters = filters or {}

    columns = get_column()
    data = get_data(filters)

    return columns, data


def get_column():
    return [
        _("Timesheet") + ":Link/Timesheet:120",
        _("Employee") + "::150",
        _("Employee Name") + "::150",
        _("From Datetime") + "::140",
        _("To Datetime") + "::140",
        _("Hours") + "::70",
        _("Activity Type") + "::120",
        _("Task") + ":Link/Task:150",
        _("Project") + ":Link/Project:120",
        _("Status") + "::70",
    ]


def get_data(filters):
    ts = frappe.qb.DocType("Timesheet")
    tsd = frappe.qb.DocType("Timesheet Detail")

    query = (
        frappe.qb.get_query(
            "Timesheet",
            fields=["name", "employee", "employee_name"],
            ignore_permissions=False,
        )
        .inner_join(tsd)
        .on(tsd.parent == ts.name)
        .select(
            tsd.from_time,
            tsd.to_time,
            tsd.hours,
            tsd.activity_type,
            tsd.task,
            tsd.project,
            ts.status,
        )
        .where(ts.docstatus == 1)
    )

    if filters.get("from_date"):
        query = query.where(tsd.from_time >= get_combine_datetime(filters.get("from_date"), "00:00:00"))

    if filters.get("to_date"):
        end_of_to_date = get_combine_datetime(add_days(getdate(filters.get("to_date")), 1), "00:00:00")
        query = query.where(tsd.to_time <= end_of_to_date)

    return query.orderby(ts.name).run(as_list=True)
