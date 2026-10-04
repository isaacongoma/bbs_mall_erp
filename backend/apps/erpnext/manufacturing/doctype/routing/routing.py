import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt


class Routing(Document):


    doctype = 'Routing'

    def validate(self):
        self.calculate_operating_cost()
        self.set_routing_id()

    def on_update(self):
        self.calculate_operating_cost()

    def calculate_operating_cost(self):
        for operation in self.operations:
            if not operation.hour_rate:
                operation.hour_rate = frappe.db.get_value("Workstation", operation.workstation, "hour_rate")
            operation.operating_cost = flt(
                flt(operation.hour_rate) * flt(operation.time_in_mins) / 60,
                operation.precision("operating_cost"),
            )

    def set_routing_id(self):
        sequence_id = 0
        for row in self.operations:
            if not row.sequence_id:
                row.sequence_id = sequence_id + 1
            elif sequence_id and row.sequence_id and cint(sequence_id) > cint(row.sequence_id):
                frappe.throw(
                    _(
                        "At row #{0}: the sequence id {1} cannot be less than previous row sequence id {2}"
                    ).format(row.idx, row.sequence_id, sequence_id)
                )

            sequence_id = row.sequence_id


@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_operations(doctype: str, txt: str, searchfield: str, start: int, page_len: int, filters: dict):
    query_filters = {}

    if txt:
        query_filters = {"operation": ["like", f"%{txt}%"]}

    if routing := filters.get("routing"):
        if not frappe.db.exists("Routing", routing):
            return []

        ptype = "select" if frappe.only_has_select_perm("Routing") else "read"
        frappe.has_permission("Routing", ptype, doc=routing, throw=True)
        query_filters["parent"] = routing
        query_filters["parenttype"] = "Routing"
    else:
        parents = []
        for parenttype in ("Routing", "BOM"):
            ptype = "select" if frappe.only_has_select_perm(parenttype) else "read"
            if frappe.has_permission(parenttype, ptype):
                parents += frappe.get_list(parenttype, pluck="name")

        if not parents:
            return []

        query_filters["parent"] = ["in", parents]

    return frappe.get_all(
        "BOM Operation",
        fields=["operation"],
        filters=query_filters,
        start=start,
        page_length=page_len,
        as_list=1,
    )
