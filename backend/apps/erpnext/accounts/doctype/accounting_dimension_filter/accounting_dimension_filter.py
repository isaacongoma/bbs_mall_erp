import frappe
from frappe import _
from frappe.model.document import Document


class AccountingDimensionFilter(Document):


    def before_save(self):
        if not self.apply_restriction_on_values:
            self.allow_or_restrict = "Restrict"
            self.set("dimensions", [])

    def validate(self):
        self.fieldname = frappe.db.get_value(
            "Accounting Dimension", {"document_type": self.accounting_dimension}, "fieldname"
        ) or frappe.scrub(self.accounting_dimension)

        self.validate_applicable_accounts()

    def validate_applicable_accounts(self):
        ApplicableOnAccount = frappe.qb.DocType("Applicable On Account")
        AccountingDimensionFilter = frappe.qb.DocType("Accounting Dimension Filter")

        query = (
            frappe.qb.from_(ApplicableOnAccount)
            .join(AccountingDimensionFilter)
            .on(AccountingDimensionFilter.name == ApplicableOnAccount.parent)
            .select(ApplicableOnAccount.applicable_on_account.as_("account"))
            .where(AccountingDimensionFilter.name != self.name)
            .where(AccountingDimensionFilter.accounting_dimension == self.accounting_dimension)
        )

        accounts = query.run(as_dict=1)
        account_list = [d.account for d in accounts]

        for account in self.get("accounts"):
            if account.applicable_on_account in account_list:
                frappe.throw(
                    _("Row {0}: {1} account already applied for Accounting Dimension {2}").format(
                        account.idx,
                        frappe.bold(account.applicable_on_account),
                        frappe.bold(self.accounting_dimension),
                    )
                )


def get_dimension_filter_map():
    ApplicableOnAccount = frappe.qb.DocType("Applicable On Account")
    AccountingDimensionFilter = frappe.qb.DocType("Accounting Dimension Filter")
    AllowedDimension = frappe.qb.DocType("Allowed Dimension")

    query = (
        frappe.qb.from_(AccountingDimensionFilter)
        .join(ApplicableOnAccount)
        .on(AccountingDimensionFilter.name == ApplicableOnAccount.parent)
        .left_join(AllowedDimension)
        .on(AllowedDimension.parent == AccountingDimensionFilter.name)
        .select(
            ApplicableOnAccount.applicable_on_account,
            AllowedDimension.dimension_value,
            AccountingDimensionFilter.accounting_dimension,
            AccountingDimensionFilter.allow_or_restrict,
            AccountingDimensionFilter.fieldname,
            ApplicableOnAccount.is_mandatory,
        )
        .where(AccountingDimensionFilter.disabled == 0)
    )

    filters = query.run(as_dict=1)
    dimension_filter_map = {}

    for f in filters:
        build_map(
            dimension_filter_map,
            f.fieldname,
            f.applicable_on_account,
            f.dimension_value,
            f.allow_or_restrict,
            f.is_mandatory,
        )
    return dimension_filter_map


def build_map(map_object, dimension, account, filter_value, allow_or_restrict, is_mandatory):
    map_object.setdefault(
        (dimension, account),
        {"allowed_dimensions": [], "is_mandatory": is_mandatory, "allow_or_restrict": allow_or_restrict},
    )
    if filter_value:
        map_object[(dimension, account)]["allowed_dimensions"].append(filter_value)
