import frappe
from frappe import _
from apps.frappe.utils import sbool


@frappe.whitelist()
def get_all_nodes(doctype: str, label: str, parent: str, tree_method: str | None, **filters):
    filters.pop("cmd", None)
    filters.pop("data", None)

    try:
        callable_tree_method = frappe.get_attr(tree_method)
    except Exception as e:
        frappe.throw(_("Failed to get method for command {0} with {1}").format(tree_method, str(e)))

    frappe.is_whitelisted(callable_tree_method)

    data = callable_tree_method(doctype, parent, **filters)
    out = [dict(parent=label, data=data)]

    filters.pop("is_root", None)
    to_check = [d.get("value") for d in data if d.get("expandable")]

    while to_check:
        parent = to_check.pop()
        data = callable_tree_method(doctype, parent, is_root=False, **filters)
        out.append(dict(parent=parent, data=data))
        for d in data:
            if d.get("expandable"):
                to_check.append(d.get("value"))

    return out


@frappe.whitelist()
def get_children(doctype: str, parent: str = "", include_disabled: str | int | bool = False, **filters):
    if isinstance(include_disabled, str):
        include_disabled = sbool(include_disabled)
    return _get_children(doctype, parent, include_disabled=include_disabled)


def _get_children(doctype, parent="", ignore_permissions=False, include_disabled=False):
    meta = frappe.get_meta(doctype)
    parent_field = meta.get("nsm_parent_field") or "parent_" + frappe.scrub(doctype)

    filters = [["docstatus", "<", 2], [parent_field, "=", parent or ""]]
    if frappe.db.has_column(doctype, "disabled") and not include_disabled:
        filters.append(["disabled", "=", 0])

    return frappe.get_list(
        doctype,
        fields=[
            "name as value",
            f"{meta.get('title_field') or 'name'} as title",
            "is_group as expandable",
        ],
        filters=filters,
        order_by="name asc",
        limit=0,
        ignore_permissions=ignore_permissions,
    )


@frappe.whitelist()
def add_node():
    args = make_tree_args(**frappe.form_dict)
    doc = frappe.get_doc(args)

    doc.save()


def make_tree_args(**kwarg):
    kwarg.pop("cmd", None)

    doctype = kwarg["doctype"]
    parent_field = "parent_" + frappe.scrub(doctype)

    if kwarg["is_root"] == "false":
        kwarg["is_root"] = False
    if kwarg["is_root"] == "true":
        kwarg["is_root"] = True

    parent = kwarg.get("parent") or kwarg.get(parent_field)
    if doctype != parent:
        kwarg.update({parent_field: parent})

    return frappe._dict(kwarg)
