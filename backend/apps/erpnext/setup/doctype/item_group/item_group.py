from apps.frappe.model.document import Document
from apps.frappe.utils.nestedset import NestedSet, get_root_of
from apps.frappe import exceptions
from apps.frappe.runtime import in_test
from django.core.cache import cache

class ItemGroup(NestedSet, Document):
    doctype = 'Item Group'

    def validate(self):
        if not self.parent_item_group and not in_test:
            root = get_root_of(self.doctype)
            if root and root != self.name:
                self.parent_item_group = root
        self.validate_item_group_defaults()
        self.check_item_tax()

    def check_item_tax(self):
        check_list = []
        for d in self.get("taxes") or []:
            if d.item_tax_template:
                if (d.item_tax_template, d.tax_category) in check_list:
                    raise exceptions.ValidationError(
                        f"<b>{d.item_tax_template}</b> entered twice for tax category <b>{d.tax_category or ''}</b> in Item Taxes"
                    )
                else:
                    check_list.append((d.item_tax_template, d.tax_category))

    def on_update(self):
        NestedSet.on_update(self)
        self.validate_one_root()
        self.delete_child_item_groups_key()

    def on_trash(self):
        NestedSet.on_trash(self, allow_root_deletion=True)
        self.delete_child_item_groups_key()

    def delete_child_item_groups_key(self):
        cache.delete(f"child_item_groups::{self.name}")

    def validate_item_group_defaults(self):
        pass

def get_child_item_groups(item_group_name):
    from apps.erpnext.registry import get_model
    model = get_model("Item Group")
    item_group = model.objects.filter(pk=item_group_name).values("lft", "rgt").first()
    if not item_group:
        return {}

    child_item_groups = list(model.objects.filter(lft__gte=item_group["lft"], rgt__lte=item_group["rgt"]).values_list("name", flat=True))
    return child_item_groups or {}

def get_item_group_defaults(item, company):
    from apps.frappe.runtime import get_doc
    item_doc = get_doc("Item", item)
    item_group = get_doc("Item Group", item_doc.item_group)

    for d in item_group.get("item_group_defaults") or []:
        if d.company == company:
            row = d.as_dict(no_private_properties=True)
            row.pop("name", None)
            return row

    return {}

def get_company_resolved_defaults(company: str) -> dict:
    if not company:
        return {}

    from apps.frappe.runtime import get_doc
    company_doc = get_doc("Company", company)

    return {
        "default_warehouse": company_doc.get("default_warehouse"),
        "default_inventory_account": company_doc.get("default_inventory_account"),
        "buying_cost_center": company_doc.get("cost_center"),
        "selling_cost_center": company_doc.get("cost_center"),
        "expense_account": company_doc.get("default_expense_account"),
        "income_account": company_doc.get("default_income_account"),
        "default_provisional_account": company_doc.get("default_provisional_account"),
        "purchase_expense_account": company_doc.get("purchase_expense_account"),
        "default_cogs_account": company_doc.get("default_expense_account"),
        "deferred_expense_account": company_doc.get("default_deferred_expense_account"),
        "deferred_revenue_account": company_doc.get("default_deferred_revenue_account"),
        "default_discount_account": company_doc.get("default_discount_account"),
        "purchase_expense_contra_account": company_doc.get("purchase_expense_contra_account"),
        "expenses_added_to_stock_account": company_doc.get("expenses_added_to_stock_account"),
        "expenses_added_to_stock_contra_account": company_doc.get("expenses_added_to_stock_contra_account"),
        "default_price_list": "",
        "default_supplier": "",
    }
