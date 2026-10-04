import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, nowdate
from pypika.terms import ExistsCriterion

from erpnext.buying.utils import validate_for_items
from erpnext.controllers.buying_controller import BuyingController

from .mapper import get_ordered_items

form_grid_templates = {"items": "templates/form_grid/item_grid.html"}


class SupplierQuotation(BuyingController):


    def before_validate(self):
        self.set_has_unit_price_items()
        self.flags.allow_zero_qty = self.has_unit_price_items

    def validate(self):
        super().validate()
        self.set_status()

        if not self.status:
            self.status = "Draft"

        from erpnext.controllers.status_updater import validate_status

        validate_status(
            self.status,
            ["Draft", "Submitted", "Partially Ordered", "Ordered", "Stopped", "Cancelled", "Expired"],
        )

        validate_for_items(self)
        self.validate_with_previous_doc()
        self.validate_uom_is_integer("uom", "qty")
        self.validate_valid_till()

    def on_submit(self):
        self.set_status(update=True)
        self.update_rfq_supplier_status(1)

    def on_cancel(self):
        self.set_status(update=True)
        self.update_rfq_supplier_status(0)

    def on_trash(self):
        pass

    def set_has_unit_price_items(self):
        """
        If permitted in settings and any item has 0 qty, the SQ has unit price items.
        """
        if not frappe.db.get_single_value("Buying Settings", "allow_zero_qty_in_supplier_quotation"):
            return

        self.has_unit_price_items = any(
            not row.qty for row in self.get("items") if (row.item_code and not row.qty)
        )

    def validate_with_previous_doc(self):
        super().validate_with_previous_doc(
            {
                "Material Request": {
                    "ref_dn_field": "prevdoc_docname",
                    "compare_fields": [["company", "="]],
                },
                "Material Request Item": {
                    "ref_dn_field": "prevdoc_detail_docname",
                    "compare_fields": [["item_code", "="], ["uom", "="]],
                    "is_child_table": True,
                },
            }
        )

    def validate_valid_till(self):
        if self.valid_till and getdate(self.valid_till) < getdate(self.transaction_date):
            frappe.throw(_("Valid till Date cannot be before Transaction Date"))

    def get_ordered_status(self):
        ordered_items = get_ordered_items(self.name)

        if not ordered_items:
            return "Submitted"

        for row in self.items:
            if row.name not in ordered_items or row.stock_qty > ordered_items[row.name]:
                return "Partially Ordered"

        return "Ordered"

    def is_fully_ordered(self):
        return self.get_ordered_status() == "Ordered"

    def is_partially_ordered(self):
        return self.get_ordered_status() == "Partially Ordered"

    def update_rfq_supplier_status(self, include_me):
        from frappe.query_builder.functions import Count

        rfq_list = set([])
        for item in self.items:
            if item.request_for_quotation:
                rfq_list.add(item.request_for_quotation)
        for rfq in rfq_list:
            doc = frappe.get_doc("Request for Quotation", rfq)
            doc_sup = frappe.get_all(
                "Request for Quotation Supplier",
                filters={"parent": doc.name, "supplier": self.supplier},
                fields=["name", "quote_status"],
            )

            doc_sup = doc_sup[0] if doc_sup else None
            if not doc_sup:
                frappe.throw(
                    _("Supplier {0} not found in {1}").format(
                        self.supplier,
                        "<a href='desk/app/Form/Request for Quotation/{0}'> Request for Quotation {0} </a>".format(
                            doc.name
                        ),
                    )
                )

            quote_status = _("Received")

            SQ = frappe.qb.DocType("Supplier Quotation")
            SQ_Item = frappe.qb.DocType("Supplier Quotation Item")

            for item in doc.items:
                query = (
                    frappe.qb.from_(SQ_Item)
                    .join(SQ)
                    .on(SQ_Item.parent == SQ.name)
                    .select(Count(SQ_Item.name).as_("count"))
                    .where(SQ.supplier == self.supplier)
                    .where(SQ_Item.docstatus == 1)
                    .where(SQ.name != self.name)
                    .where(SQ_Item.request_for_quotation_item == item.name)
                )

                result = query.run(as_dict=True)
                sqi_count = result[0] if result else frappe._dict(count=0)

                self_count = (
                    sum(my_item.request_for_quotation_item == item.name for my_item in self.items)
                    if include_me
                    else 0
                )
                if (sqi_count.count + self_count) == 0:
                    quote_status = _("Pending")

                frappe.db.set_value(
                    "Request for Quotation Supplier", doc_sup.name, "quote_status", quote_status
                )


def get_list_context(context=None):
    from erpnext.controllers.website_list_for_contact import get_list_context

    list_context = get_list_context(context)
    list_context.update(
        {
            "show_sidebar": True,
            "show_search": True,
            "no_breadcrumbs": True,
            "title": _("Supplier Quotation"),
            "list_template": "templates/includes/list/list.html",
        }
    )

    return list_context


def set_expired_status():
    supplier_quotation = frappe.qb.DocType("Supplier Quotation")
    purchase_order = frappe.qb.DocType("Purchase Order")
    purchase_order_item = frappe.qb.DocType("Purchase Order Item")

    purchase_order_against_quotation = (
        frappe.qb.from_(purchase_order)
        .from_(purchase_order_item)
        .select(purchase_order.name)
        .where(
            (purchase_order_item.docstatus == 1)
            & (purchase_order.docstatus == 1)
            & (purchase_order_item.parent == purchase_order.name)
            & (purchase_order_item.supplier_quotation == supplier_quotation.name)
        )
    )

    (
        frappe.qb.update(supplier_quotation)
        .set(supplier_quotation.status, "Expired")
        .where(
            (supplier_quotation.docstatus == 1)
            & (supplier_quotation.status.notin(["Expired", "Stopped"]))
            & (supplier_quotation.valid_till < nowdate())
            & ExistsCriterion(purchase_order_against_quotation).negate()
        )
    ).run()
