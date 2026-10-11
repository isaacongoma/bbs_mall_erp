import frappe
from frappe import _
from frappe.utils import cint, flt


def variant_rows(doc):
    return [row for row in doc.get("variants") or [] if cint(row.enabled)]


def variant_on_hand(doc, row):
    if doc.stock_mode == "ERPNext Stock" and doc.warehouse:
        return flt(frappe.db.get_value("Bin", {"item_code": row.item_code, "warehouse": doc.warehouse}, "actual_qty"))
    return flt(row.stock_qty)


def on_hand(doc, variant=None):
    if doc.get("has_variants"):
        rows = variant_rows(doc)
        if variant:
            rows = [row for row in rows if row.item_code == variant]
        return sum(variant_on_hand(doc, row) for row in rows)
    if doc.stock_mode == "ERPNext Stock" and doc.warehouse:
        return flt(frappe.db.get_value("Bin", {"item_code": doc.item, "warehouse": doc.warehouse}, "actual_qty"))
    return flt(doc.stock_qty)


def available(doc, variant=None):
    if doc.get("has_variants"):
        rows = variant_rows(doc)
        if variant:
            rows = [row for row in rows if row.item_code == variant]
        return sum(max(0.0, variant_on_hand(doc, row) - flt(row.reserved_qty)) for row in rows)
    return max(0.0, on_hand(doc) - flt(doc.reserved_qty))


def refresh_available(name):
    doc = frappe.get_doc("Marketplace Listing", name)
    values = {"available_qty": available(doc)}
    if doc.has_variants:
        for row in doc.variants:
            frappe.db.set_value("Listing Variant", row.name, "available_qty", max(0.0, variant_on_hand(doc, row) - flt(row.reserved_qty)), update_modified=False)
        values["stock_qty"] = sum(flt(row.stock_qty) for row in doc.variants if cint(row.enabled))
        values["reserved_qty"] = sum(flt(row.reserved_qty) for row in doc.variants)
    frappe.db.set_value("Marketplace Listing", name, values, update_modified=False)


def _locked(listing):
    rows = frappe.db.sql(
        'select reserved_qty, stock_qty, stock_mode, item, warehouse, allow_backorder, sold_count, listing_title, has_variants from "tabMarketplace Listing" where name = %s for update',
        listing,
        as_dict=True,
    )
    return rows[0] if rows else None


def _locked_variant(listing, variant):
    rows = frappe.db.sql(
        'select name, reserved_qty, stock_qty, item_code from "tabListing Variant" where parent = %s and item_code = %s for update',
        (listing, variant),
        as_dict=True,
    )
    return rows[0] if rows else None


def _require_variant(row, variant):
    if cint(row.has_variants) and not variant:
        frappe.throw(_("Choose an option for {0}").format(row.listing_title))


def reserve(listing, qty, variant=None):
    row = _locked(listing)
    if not row:
        frappe.throw(_("Listing {0} no longer exists").format(listing))
    _require_variant(row, variant)
    if cint(row.has_variants):
        child = _locked_variant(listing, variant)
        if not child:
            frappe.throw(_("That option is no longer available for {0}").format(row.listing_title))
        base = flt(child.stock_qty)
        if row.stock_mode == "ERPNext Stock" and row.warehouse:
            base = flt(frappe.db.get_value("Bin", {"item_code": variant, "warehouse": row.warehouse}, "actual_qty"))
        if not cint(row.allow_backorder) and base - flt(child.reserved_qty) < flt(qty):
            frappe.throw(_("Only {0} left of {1}").format(max(0.0, base - flt(child.reserved_qty)), row.listing_title))
        frappe.db.set_value("Listing Variant", child.name, "reserved_qty", flt(child.reserved_qty) + flt(qty), update_modified=False)
        refresh_available(listing)
        return
    base = flt(row.stock_qty)
    if row.stock_mode == "ERPNext Stock" and row.warehouse:
        base = flt(frappe.db.get_value("Bin", {"item_code": row.item, "warehouse": row.warehouse}, "actual_qty"))
    if not cint(row.allow_backorder) and base - flt(row.reserved_qty) < flt(qty):
        frappe.throw(_("Only {0} left of {1}").format(max(0.0, base - flt(row.reserved_qty)), row.listing_title))
    frappe.db.set_value("Marketplace Listing", listing, "reserved_qty", flt(row.reserved_qty) + flt(qty), update_modified=False)
    refresh_available(listing)


def release(listing, qty, variant=None):
    row = _locked(listing)
    if not row:
        return
    if cint(row.has_variants) and variant:
        child = _locked_variant(listing, variant)
        if child:
            frappe.db.set_value("Listing Variant", child.name, "reserved_qty", max(0.0, flt(child.reserved_qty) - flt(qty)), update_modified=False)
        refresh_available(listing)
        return
    frappe.db.set_value("Marketplace Listing", listing, "reserved_qty", max(0.0, flt(row.reserved_qty) - flt(qty)), update_modified=False)
    refresh_available(listing)


def commit(listing, qty, variant=None):
    row = _locked(listing)
    if not row:
        return
    frappe.db.set_value("Marketplace Listing", listing, "sold_count", flt(row.sold_count) + flt(qty), update_modified=False)
    if cint(row.has_variants) and variant:
        child = _locked_variant(listing, variant)
        if child:
            updates = {"reserved_qty": max(0.0, flt(child.reserved_qty) - flt(qty))}
            if row.stock_mode != "ERPNext Stock":
                updates["stock_qty"] = flt(child.stock_qty) - flt(qty)
            frappe.db.set_value("Listing Variant", child.name, updates, update_modified=False)
        refresh_available(listing)
        return
    frappe.db.set_value("Marketplace Listing", listing, "reserved_qty", max(0.0, flt(row.reserved_qty) - flt(qty)), update_modified=False)
    if row.stock_mode != "ERPNext Stock":
        frappe.db.set_value("Marketplace Listing", listing, "stock_qty", flt(row.stock_qty) - flt(qty), update_modified=False)
    refresh_available(listing)


def restock(listing, qty, variant=None):
    row = _locked(listing)
    if not row or row.stock_mode == "ERPNext Stock":
        return
    frappe.db.set_value("Marketplace Listing", listing, "sold_count", max(0.0, flt(row.sold_count) - flt(qty)), update_modified=False)
    if cint(row.has_variants) and variant:
        child = _locked_variant(listing, variant)
        if child:
            frappe.db.set_value("Listing Variant", child.name, "stock_qty", flt(child.stock_qty) + flt(qty), update_modified=False)
        refresh_available(listing)
        return
    frappe.db.set_value("Marketplace Listing", listing, "stock_qty", flt(row.stock_qty) + flt(qty), update_modified=False)
    refresh_available(listing)
