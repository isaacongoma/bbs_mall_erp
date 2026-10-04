from apps.frappe.utils.nestedset import NestedSet, get_root_of
from apps.erpnext.registry import get_model


class CustomerGroup(NestedSet):
    doctype = "Customer Group"
    nsm_parent_field = "parent_customer_group"

    def validate(self):
        if not self.get("parent_customer_group"):
            self.parent_customer_group = get_root_of("Customer Group")
        self.validate_currency_for_receivable_and_advance_account()

    def validate_currency_for_receivable_and_advance_account(self):
        import frappe

        for x in self.get("accounts") or []:
            receivable_account_currency = None
            advance_account_currency = None

            if getattr(x, "account", None):
                receivable_account_currency = frappe.get_cached_value("Account", x.account, "account_currency")

            if getattr(x, "advance_account", None):
                advance_account_currency = frappe.get_cached_value("Account", x.advance_account, "account_currency")

            if (
                receivable_account_currency
                and advance_account_currency
                and receivable_account_currency != advance_account_currency
            ):
                frappe.throw(
                    frappe._(
                        "Both Receivable Account: {0} and Advance Account: {1} must be of same currency for company: {2}"
                    ).format(
                        frappe.bold(getattr(x, "account", "")),
                        frappe.bold(getattr(x, "advance_account", "")),
                        frappe.bold(getattr(x, "company", "")),
                    )
                )

    def on_update(self):
        super().on_update()
        self.validate_one_root()


def get_parent_customer_groups(customer_group):
    CustomerGroupModel = get_model("Customer Group")
    try:
        cg = CustomerGroupModel.objects.get(name=customer_group)
        lft = getattr(cg, "lft", 0)
        rgt = getattr(cg, "rgt", 0)
        
        qs = CustomerGroupModel.objects.filter(
            lft__lte=lft,
            rgt__gte=rgt
        ).order_by("lft").values("name")
        return list(qs)
    except CustomerGroupModel.DoesNotExist:
        return []
