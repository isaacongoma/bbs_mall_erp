import frappe
from frappe import _
from frappe.model.document import Document
from frappe.query_builder.functions import Sum
from frappe.utils import flt


class CashierClosing(Document):


    doctype = 'Cashier Closing'

    def validate(self):
        self.validate_time()

    def before_save(self):
        self.get_outstanding()
        self.make_calculations()

    def get_outstanding(self):
        si = frappe.qb.DocType("Sales Invoice")
        values = (
            frappe.qb.from_(si)
            .select(Sum(si.outstanding_amount))
            .where(
                (si.posting_date == self.date)
                & (si.posting_time >= self.from_time)
                & (si.posting_time <= self.time)
                & (si.owner == self.user)
            )
            .run()
        )
        self.outstanding_amount = flt(values[0][0] if values else 0)

    def make_calculations(self):
        total = 0.00
        for i in self.payments:
            total += flt(i.amount)

        self.net_amount = (
            total + self.outstanding_amount + flt(self.expense) - flt(self.custody) + flt(self.returns)
        )

    def validate_time(self):
        if self.from_time >= self.time:
            frappe.throw(_("From Time Should Be Less Than To Time"))
