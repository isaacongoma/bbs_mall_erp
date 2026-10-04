from apps.frappe.utils.nestedset import NestedSet, get_root_of, update_nsm
from apps.frappe import exceptions
from apps.erpnext.registry import get_model


class SupplierGroup(NestedSet):
    doctype = "Supplier Group"
    nsm_parent_field = "parent_supplier_group"

    def validate(self):
        if not self.get("parent_supplier_group"):
            self.parent_supplier_group = get_root_of("Supplier Group")
        self.validate_currency_for_payable_and_advance_account()

    def validate_currency_for_payable_and_advance_account(self):
        AccountModel = get_model("Account")
        for x in self.get("accounts", []):
            payable_account_currency = None
            advance_account_currency = None

            if getattr(x, "account", None):
                try:
                    acc = AccountModel.objects.get(name=x.account)
                    payable_account_currency = getattr(acc, "account_currency", None)
                except AccountModel.DoesNotExist:
                    pass

            if getattr(x, "advance_account", None):
                try:
                    adv_acc = AccountModel.objects.get(name=x.advance_account)
                    advance_account_currency = getattr(adv_acc, "account_currency", None)
                except AccountModel.DoesNotExist:
                    pass

            if (
                payable_account_currency
                and advance_account_currency
                and payable_account_currency != advance_account_currency
            ):
                raise exceptions.ValidationError(
                    f"Both Payable Account: {x.account} and Advance Account: {x.advance_account} must be of same currency for company: {getattr(x, 'company', '')}"
                )

    def on_update(self):
        super().on_update()
        self.validate_one_root()

    def on_trash(self):
        self.validate_if_child_exists()
        update_nsm(self)


def get_parent_supplier_groups(supplier_group):
    SupplierGroupModel = get_model("Supplier Group")
    try:
        sg = SupplierGroupModel.objects.get(name=supplier_group)
        lft = getattr(sg, "lft", 0)
        rgt = getattr(sg, "rgt", 0)
        
        qs = SupplierGroupModel.objects.filter(
            lft__lte=lft,
            rgt__gte=rgt
        ).order_by("lft").values("name")
        return list(qs)
    except SupplierGroupModel.DoesNotExist:
        return []
