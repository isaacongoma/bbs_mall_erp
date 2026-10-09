
import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import add_to_date


class SalesForecast(Document):


    doctype = 'Sales Forecast'

    def on_discard(self):
        self.db_set("status", "Cancelled")

    def generate_manual_demand(self):
        if not self.selected_items:
            return

        item_details_by_code = {
            item.name: item
            for item in frappe.get_all(
                "Item",
                filters={"name": ["in", [row.item_code for row in self.selected_items]]},
                fields=["name", "item_name", "stock_uom as uom"],
            )
        }
        ascii_items_by_lowercase_code = {}
        if frappe.db.db_type == "mariadb":
            ascii_items_by_lowercase_code = {
                code.lower(): item for code, item in item_details_by_code.items() if code.isascii()
            }

        forecast_demand = []
        for row in self.selected_items:
            if row.item_code not in item_details_by_code:
                matching_item = None
                if row.item_code.isascii():
                    matching_item = ascii_items_by_lowercase_code.get(row.item_code.lower())

                item_details_by_code[row.item_code] = matching_item or frappe.db.get_value(
                    "Item", row.item_code, ["item_name", "stock_uom as uom"], as_dict=True
                )
            item_details = item_details_by_code[row.item_code]

            for index in range(self.demand_number):
                if self.frequency == "Monthly":
                    delivery_date = add_to_date(self.from_date, months=index + 1)
                else:
                    delivery_date = add_to_date(self.from_date, weeks=index + 1)

                forecast_demand.append(
                    {
                        "item_code": row.item_code,
                        "delivery_date": delivery_date,
                        "item_name": item_details.item_name,
                        "uom": item_details.uom,
                        "demand_qty": 1.0,
                    }
                )

        for demand in forecast_demand:
            self.append("items", demand)

    @frappe.whitelist()
    def generate_demand(self):
        self.set("items", [])
        self.generate_manual_demand()


@frappe.whitelist()
def create_mps(source_name: str, target_doc: str | dict | Document | None = None):
    def postprocess(source, doc):
        doc.naming_series = "MPS.YY.-.######"

    doc = get_mapped_doc(
        "Sales Forecast",
        source_name,
        {
            "Sales Forecast": {
                "doctype": "Master Production Schedule",
                "validation": {"docstatus": ["=", 1]},
                "field_map": {
                    "name": "sales_forecast",
                    "from_date": "from_date",
                },
            },
        },
        target_doc,
        postprocess,
    )

    return doc
