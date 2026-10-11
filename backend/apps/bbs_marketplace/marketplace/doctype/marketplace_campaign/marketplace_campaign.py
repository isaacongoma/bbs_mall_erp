import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, get_datetime


class MarketplaceCampaign(Document):
    doctype = "Marketplace Campaign"

    def validate(self):
        if get_datetime(self.end_date) <= get_datetime(self.start_date):
            frappe.throw(_("The campaign must end after it starts"))
        seen = set()
        live = self.status in ("Scheduled", "Active")
        if live and not self.listings:
            frappe.throw(_("Add listings before scheduling the campaign"))
        if self.funded_by == "Shared" and not flt(self.platform_share_percent):
            frappe.throw(_("Set the platform share % for a shared campaign"))
        for row in self.listings:
            if row.listing in seen:
                frappe.throw(_("Row {0}: {1} is listed twice").format(row.idx, row.listing))
            seen.add(row.listing)
            if row.discount_type == "Percent" and not (0 < flt(row.discount_value) < 100):
                frappe.throw(_("Row {0}: a percentage discount must be between 0 and 100").format(row.idx))
            if row.discount_type == "Amount":
                price = flt(frappe.db.get_value("Marketplace Listing", row.listing, "price"))
                if flt(row.discount_value) <= 0 or flt(row.discount_value) >= price:
                    frappe.throw(_("Row {0}: the discount must be below the price of {1}").format(row.idx, price))
            if live:
                clash = frappe.db.sql(
                    'select c.name from "tabCampaign Listing" cl join "tabMarketplace Campaign" c on c.name = cl.parent where cl.listing = %s and c.name != %s and c.status in (\'Scheduled\', \'Active\') and c.start_date < %s and c.end_date > %s limit 1',
                    (row.listing, self.name or "", self.end_date, self.start_date),
                )
                if clash:
                    frappe.throw(_("Row {0}: {1} is already in the overlapping campaign {2}").format(row.idx, row.listing, clash[0][0]))
