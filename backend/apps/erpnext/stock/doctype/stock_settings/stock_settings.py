import frappe
from frappe import _
from frappe.custom.doctype.property_setter.property_setter import make_property_setter
from frappe.model.document import Document
from frappe.utils.html_utils import clean_html

from erpnext.stock.utils import check_pending_reposting


class StockSettings(Document):


    doctype = 'Stock Settings'

    def validate(self):
        for key in [
            "item_naming_by",
            "item_group",
            "stock_uom",
            "allow_negative_stock",
            "set_qty_in_transactions_based_on_serial_no_input",
            "use_serial_batch_fields",
            "enable_serial_and_batch_no_for_item",
            "set_serial_and_batch_bundle_naming_based_on_naming_series",
        ]:
            frappe.db.set_default(key, self.get(key, ""))

        self.update_item_naming_settings()
        self.update_barcode_field_visibility()

        self.validate_over_delivery_receipt_allowance()
        self.validate_serial_and_batch_no_settings()
        self.cant_change_valuation_method()
        self.validate_clean_description_html()
        self.validate_pending_reposts()
        self.validate_stock_reservation()
        self.validate_auto_insert_price_list_rate_if_missing()
        self.change_precision_for_for_sales()
        self.change_precision_for_purchase()
        self.change_precision_for_stock_entry()
        self.validate_do_not_use_batchwise_valuation()

    def update_item_naming_settings(self):
        if not self.has_value_changed("item_naming_by"):
            return

        from erpnext.utilities.naming import set_by_naming_series

        set_by_naming_series(
            "Item",
            "item_code",
            self.get("item_naming_by") == "Naming Series",
            hide_name_field=True,
            make_mandatory=0,
        )

    def update_barcode_field_visibility(self):
        if not self.has_value_changed("show_barcode_field"):
            return

        for name in ["barcode", "barcodes", "scan_barcode"]:
            frappe.make_property_setter(
                {"fieldname": name, "property": "hidden", "value": 0 if self.show_barcode_field else 1},
                validate_fields_for_doctype=False,
            )

    def validate_over_delivery_receipt_allowance(self):
        if not self.over_delivery_receipt_allowance:
            self.role_allowed_to_over_deliver_receive = None

    def validate_do_not_use_batchwise_valuation(self):
        doc_before_save = self.get_doc_before_save()
        if not doc_before_save:
            return

        if not frappe.db.exists("Serial and Batch Bundle", {"docstatus": 1}):
            return

        if doc_before_save.do_not_use_batchwise_valuation and not self.do_not_use_batchwise_valuation:
            frappe.throw(
                _("Cannot disable {0} as it may lead to incorrect stock valuation.").format(
                    frappe.bold(_("Do Not Use Batchwise Valuation"))
                )
            )

    def validate_serial_and_batch_no_settings(self):
        doc_before_save = self.get_doc_before_save()
        if not doc_before_save:
            return

        if doc_before_save.enable_serial_and_batch_no_for_item == self.enable_serial_and_batch_no_for_item:
            return

        if (
            doc_before_save.enable_serial_and_batch_no_for_item
            and not self.enable_serial_and_batch_no_for_item
        ):
            if frappe.db.exists("Serial and Batch Bundle", {"docstatus": 1}):
                frappe.throw(
                    _(
                        "Cannot disable Serial and Batch No for Item, as there are existing records for serial / batch."
                    )
                )

            if frappe.db.exists("Item", {"has_serial_no": 1}) or frappe.db.exists(
                "Item", {"has_batch_no": 1}
            ):
                frappe.throw(
                    _(
                        "Cannot disable Serial and Batch No for Item, as there are items with serial / batch enabled."
                    )
                )

    def cant_change_valuation_method(self):
        doc_before_save = self.get_doc_before_save()
        if not doc_before_save:
            return

        previous_valuation_method = doc_before_save.get("valuation_method")

        if previous_valuation_method and previous_valuation_method != self.valuation_method:
            sle_dt = frappe.qb.DocType("Stock Ledger Entry")
            item = frappe.qb.DocType("Item")
            sle = (
                frappe.qb.from_(sle_dt)
                .select(sle_dt.name)
                .where(
                    sle_dt.item_code.isin(
                        frappe.qb.from_(item)
                        .select(item.name)
                        .where(item.valuation_method.isnull() | (item.valuation_method == ""))
                    )
                )
                .limit(1)
                .run()
            )

            if sle:
                frappe.throw(
                    _(
                        "Can't change the valuation method, as there are transactions against some items which do not have their own valuation method"
                    )
                )

    def validate_clean_description_html(self):
        if int(self.clean_description_html or 0) and not int(self.db_get("clean_description_html") or 0):
            frappe.enqueue(
                "erpnext.stock.doctype.stock_settings.stock_settings.clean_all_descriptions",
                now=frappe.in_test,
                enqueue_after_commit=True,
            )

    def validate_pending_reposts(self):
        if self.stock_frozen_upto:
            check_pending_reposting(self.stock_frozen_upto)

    def validate_stock_reservation(self):
        """Raises an exception if the user tries to enable/disable `Stock Reservation` with `Negative Stock` or `Open Stock Reservation Entries`."""

        if not self.enable_stock_reservation and self.auto_reserve_stock:
            self.auto_reserve_stock = 0

        if frappe.in_test:
            return

        if self.has_value_changed("allow_negative_stock"):
            if self.allow_negative_stock and self.enable_stock_reservation:
                frappe.throw(
                    _("As {0} is enabled, you can not enable {1}.").format(
                        frappe.bold(_("Stock Reservation")), frappe.bold(_("Allow Negative Stock"))
                    )
                )

        if self.has_value_changed("enable_stock_reservation"):
            if self.enable_stock_reservation:
                if self.allow_negative_stock:
                    frappe.throw(
                        _("As {0} is enabled, you can not enable {1}.").format(
                            frappe.bold(_("Allow Negative Stock")), frappe.bold(_("Stock Reservation"))
                        )
                    )

            else:
                has_reserved_stock = frappe.db.exists(
                    "Stock Reservation Entry", {"docstatus": 1, "status": ["!=", "Delivered"]}
                )

                if has_reserved_stock:
                    frappe.throw(
                        _("As there is reserved stock, you cannot disable {0}.").format(
                            frappe.bold(_("Stock Reservation"))
                        )
                    )

    def validate_auto_insert_price_list_rate_if_missing(self):
        if (
            self.auto_insert_price_list_rate_if_missing
            and self.has_value_changed("auto_insert_price_list_rate_if_missing")
            and frappe.get_single_value("Selling Settings", "fallback_to_default_price_list")
        ):
            selling_meta = frappe.get_meta("Selling Settings")
            frappe.msgprint(
                _(
                    "You have enabled {0} and {1} in {2}. This can lead to prices from the default price list being inserted in the transaction price list."
                ).format(
                    "<i>{}</i>".format(
                        self.meta.get_translated_label("auto_insert_price_list_rate_if_missing")
                    ),
                    "<i>{}</i>".format(selling_meta.get_translated_label("fallback_to_default_price_list")),
                    frappe.bold(_("Selling Settings")),
                )
            )

    def change_precision_for_for_sales(self):
        doc_before_save = self.get_doc_before_save()
        if doc_before_save and (
            doc_before_save.allow_to_edit_stock_uom_qty_for_sales
            == self.allow_to_edit_stock_uom_qty_for_sales
        ):
            return

        if self.allow_to_edit_stock_uom_qty_for_sales:
            doctypes = ["Sales Order Item", "Sales Invoice Item", "Delivery Note Item", "Quotation Item"]
            self.make_property_setter_for_precision(doctypes)

    def change_precision_for_purchase(self):
        doc_before_save = self.get_doc_before_save()
        if doc_before_save and (
            doc_before_save.allow_to_edit_stock_uom_qty_for_purchase
            == self.allow_to_edit_stock_uom_qty_for_purchase
        ):
            return

        if self.allow_to_edit_stock_uom_qty_for_purchase:
            doctypes = [
                "Purchase Order Item",
                "Purchase Receipt Item",
                "Purchase Invoice Item",
                "Request for Quotation Item",
                "Supplier Quotation Item",
                "Material Request Item",
            ]
            self.make_property_setter_for_precision(doctypes)

    def change_precision_for_stock_entry(self):
        doc_before_save = self.get_doc_before_save()
        if doc_before_save and (
            doc_before_save.allow_to_edit_stock_uom_qty_for_stock_entry
            == self.allow_to_edit_stock_uom_qty_for_stock_entry
        ):
            return

        if self.allow_to_edit_stock_uom_qty_for_stock_entry:
            doctypes = ["Stock Entry Detail"]
            self.make_property_setter_for_precision(doctypes)

    @staticmethod
    def make_property_setter_for_precision(doctypes):
        for doctype in doctypes:
            if property_name := frappe.db.exists(
                "Property Setter",
                {"doc_type": doctype, "field_name": "conversion_factor", "property": "precision"},
            ):
                frappe.db.set_value("Property Setter", property_name, "value", 9)
                continue

            make_property_setter(
                doctype,
                "conversion_factor",
                "precision",
                9,
                "Float",
                validate_fields_for_doctype=False,
            )


def clean_all_descriptions():
    for item in frappe.get_all("Item", ["name", "description"]):
        if item.description:
            clean_description = clean_html(item.description)
            if item.description != clean_description:
                frappe.db.set_value("Item", item.name, "description", clean_description)


@frappe.whitelist()
def get_enable_stock_uom_editing():
    return frappe.get_single_value(
        "Stock Settings",
        [
            "allow_to_edit_stock_uom_qty_for_sales",
            "allow_to_edit_stock_uom_qty_for_purchase",
            "allow_to_edit_stock_uom_qty_for_stock_entry",
        ],
        as_dict=1,
    )
