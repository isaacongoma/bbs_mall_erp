import frappe
from frappe import _
from frappe.utils import cint, flt

from erpnext.controllers.item_variant import create_variant, generate_keyed_value_combinations, get_variant

MAX_COMBINATIONS = 200


def variant_attributes(item_code):
    return frappe.db.sql(
        'select attribute, attribute_value from "tabItem Variant Attribute" where parent = %s order by idx',
        item_code,
        as_dict=True,
    )


def options_text(item_code):
    return ", ".join(f"{row.attribute}: {row.attribute_value}" for row in variant_attributes(item_code))


def options_map(item_code):
    return {row.attribute: row.attribute_value for row in variant_attributes(item_code)}


def clean_axes(attributes):
    axes = {}
    for attribute, values in (frappe.parse_json(attributes) or {}).items():
        if isinstance(values, str):
            values = [part.strip() for part in values.replace("\n", ",").split(",")]
        values = [value for value in (values or []) if value]
        if not values:
            continue
        if not frappe.db.exists("Item Attribute", attribute):
            frappe.throw(_("Item Attribute {0} does not exist").format(attribute))
        axes[attribute] = list(dict.fromkeys(values))
    return axes


def check_attribute_values(axes):
    for attribute, values in axes.items():
        meta = frappe.db.get_value("Item Attribute", attribute, ["numeric_values"], as_dict=True)
        if cint(meta.numeric_values):
            continue
        allowed = {row.attribute_value for row in frappe.get_all("Item Attribute Value", filters={"parent": attribute}, fields=["attribute_value"])}
        for value in values:
            if value not in allowed:
                frappe.throw(_("{0} is not a value of {1}. Add it to the Item Attribute first.").format(value, attribute))


def generate(listing, attributes):
    doc = frappe.get_doc("Marketplace Listing", listing) if isinstance(listing, str) else listing
    axes = clean_axes(attributes)
    if not axes:
        frappe.throw(_("Choose at least one attribute and its values"))
    check_attribute_values(axes)
    combinations = generate_keyed_value_combinations(axes)
    if len(combinations) > MAX_COMBINATIONS:
        frappe.throw(_("{0} combinations is too many. Keep it under {1}").format(len(combinations), MAX_COMBINATIONS))
    template = frappe.get_doc("Item", doc.item)
    if not template.has_variants:
        if frappe.db.exists("Stock Ledger Entry", {"item_code": template.name, "is_cancelled": 0}):
            frappe.throw(_("{0} already has stock movements, so it cannot become a variant template").format(template.name))
        template.has_variants = 1
        template.variant_based_on = "Item Attribute"
    existing = {row.attribute for row in template.attributes}
    for attribute in axes:
        if attribute not in existing:
            template.append("attributes", {"attribute": attribute})
    template.flags.ignore_permissions = True
    template.save()
    known = {row.item_code: row for row in doc.variants}
    created = 0
    for combination in combinations:
        code = get_variant(template.name, args=combination)
        if not code:
            variant = create_variant(template.name, combination)
            variant.flags.ignore_permissions = True
            variant.save()
            code = variant.name
            created += 1
        if code not in known:
            doc.append(
                "variants",
                {"item_code": code, "options": options_text(code), "sku": code, "enabled": 1, "stock_qty": 0},
            )
    doc.set("variant_axes", [{"attribute": attribute} for attribute in dict.fromkeys(list(axes) + [row.attribute for row in doc.variant_axes])])
    doc.flags.ignore_permissions = True
    doc.save()
    return {"created": created, "variants": [row.item_code for row in doc.variants]}


def validate(doc):
    rows = list(doc.get("variants") or [])
    doc.has_variants = 1 if rows else 0
    if not rows:
        return
    seen = set()
    template = doc.item
    for row in rows:
        if row.item_code in seen:
            frappe.throw(_("Variant {0} appears twice").format(row.item_code))
        seen.add(row.item_code)
        if frappe.db.get_value("Item", row.item_code, "variant_of") != template:
            frappe.throw(_("{0} is not a variant of {1}").format(row.item_code, template))
        if frappe.db.get_value("Item", row.item_code, "disabled"):
            row.enabled = 0
        row.options = row.options or options_text(row.item_code)
        if row.price not in (None, "") and flt(row.price) < 0:
            frappe.throw(_("Variant {0}: price cannot be negative").format(row.item_code))
        if flt(row.compare_at_price) and flt(row.price or doc.price) > flt(row.compare_at_price):
            frappe.throw(_("Variant {0}: the was-price must be above the selling price").format(row.item_code))
        if flt(row.stock_qty) < flt(row.reserved_qty):
            frappe.throw(_("Variant {0}: stock cannot go below the {1} units reserved").format(row.item_code, flt(row.reserved_qty)))
    if not any(cint(row.enabled) for row in rows):
        frappe.throw(_("Enable at least one variant"))


def row_of(doc, item_code, require=True):
    row = next((r for r in doc.get("variants") or [] if r.item_code == item_code), None)
    if require and (not row or not cint(row.enabled)):
        frappe.throw(_("That option is not available for {0}").format(doc.listing_title))
    return row


def unit_price(doc, row):
    if row is not None and row.price not in (None, "") and flt(row.price) > 0:
        return flt(row.price)
    return None


def price_range(doc):
    prices = []
    for row in doc.get("variants") or []:
        if cint(row.enabled):
            prices.append(unit_price(doc, row) or flt(doc.price))
    return (min(prices), max(prices)) if prices else (flt(doc.price), flt(doc.price))


def storefront(doc, price_for):
    rows = [row for row in doc.get("variants") or [] if cint(row.enabled)]
    axes = [row.attribute for row in doc.variant_axes]
    values = {attribute: [] for attribute in axes}
    variants = []
    for row in rows:
        chosen = options_map(row.item_code)
        for attribute, value in chosen.items():
            if value not in values.setdefault(attribute, []):
                values[attribute].append(value)
        variants.append(
            {
                "item_code": row.item_code,
                "sku": row.sku,
                "options": chosen,
                "image": row.image,
                "price": price_for(row),
                "compare_at_price": flt(row.compare_at_price) or None,
                "available": flt(row.available_qty),
                "in_stock": flt(row.available_qty) > 0 or bool(cint(doc.allow_backorder)),
            }
        )
    return {"axes": [{"attribute": attribute, "values": values.get(attribute, [])} for attribute in axes], "variants": variants}
