from __future__ import annotations

from collections import defaultdict

import frappe
from frappe import _


def get_child_tables_of_doctypes(doctypes: list[str] | None = None):
    """Return child tables by doctype."""
    filters = [["fieldtype", "=", "Table"]]
    filters_for_docfield = filters
    filters_for_customfield = filters

    if doctypes:
        filters_for_docfield = [*filters, ["parent", "in", tuple(doctypes)]]
        filters_for_customfield = [*filters, ["dt", "in", tuple(doctypes)]]

    links = frappe.get_all(
        "DocField",
        fields=["parent", "fieldname", "options as child_table"],
        filters=filters_for_docfield,
        as_list=1,
        order_by=None,
    )

    links += frappe.get_all(
        "Custom Field",
        fields=["dt as parent", "fieldname", "options as child_table"],
        filters=filters_for_customfield,
        as_list=1,
        order_by=None,
    )

    child_tables_by_doctype = defaultdict(list)
    for doctype, fieldname, child_table in links:
        child_tables_by_doctype[doctype].append(
            {"doctype": doctype, "fieldname": fieldname, "child_table": child_table}
        )
    return child_tables_by_doctype


def get_references_across_doctypes(
    to_doctypes: list[str] | None = None, limit_link_doctypes: list[str] | None = None
) -> list:
    """Find doctype wise foreign key references.

    :param to_doctypes: Get links of these doctypes.
    :param limit_link_doctypes: limit links to these doctypes.

    * Include child table, link and dynamic link references.
    """
    if limit_link_doctypes:
        child_tables_by_doctype = get_child_tables_of_doctypes(limit_link_doctypes)
        all_child_tables = [
            each["child_table"] for each in itertools.chain(*child_tables_by_doctype.values())
        ]
        limit_link_doctypes = limit_link_doctypes + all_child_tables
    else:
        child_tables_by_doctype = get_child_tables_of_doctypes()
        all_child_tables = [
            each["child_table"] for each in itertools.chain(*child_tables_by_doctype.values())
        ]

    references_by_link_fields = get_references_across_doctypes_by_link_field(to_doctypes, limit_link_doctypes)
    references_by_dlink_fields = get_references_across_doctypes_by_dynamic_link_field(
        to_doctypes, limit_link_doctypes
    )

    references = references_by_link_fields.copy()
    for k, v in references_by_dlink_fields.items():
        references.setdefault(k, []).extend(v)

    for links in references.values():
        for link in links:
            link["is_child"] = link["doctype"] in all_child_tables
    return references


def get_references_across_doctypes_by_link_field(
    to_doctypes: list[str] | None = None, limit_link_doctypes: list[str] | None = None
):
    """Find doctype wise foreign key references based on link fields.

    :param to_doctypes: Get links to these doctypes.
    :param limit_link_doctypes: limit links to these doctypes.
    """
    filters = [["fieldtype", "=", "Link"]]

    if to_doctypes:
        filters += [["options", "in", tuple(to_doctypes)]]

    filters_for_docfield = filters[:]
    filters_for_customfield = filters[:]

    if limit_link_doctypes:
        filters_for_docfield += [["parent", "in", tuple(limit_link_doctypes)]]
        filters_for_customfield += [["dt", "in", tuple(limit_link_doctypes)]]

    links = frappe.get_all(
        "DocField",
        fields=["parent", "fieldname", "options as linked_to"],
        filters=filters_for_docfield,
        as_list=1,
    )

    links += frappe.get_all(
        "Custom Field",
        fields=["dt as parent", "fieldname", "options as linked_to"],
        filters=filters_for_customfield,
        as_list=1,
    )

    links_by_doctype = defaultdict(list)
    for doctype, fieldname, linked_to in links:
        links_by_doctype[linked_to].append({"doctype": doctype, "fieldname": fieldname})
    return links_by_doctype


def get_references_across_doctypes_by_dynamic_link_field(
    to_doctypes: list[str] | None = None, limit_link_doctypes: list[str] | None = None
):
    """Find doctype wise foreign key references based on dynamic link fields.

    :param to_doctypes: Get links to these doctypes.
    :param limit_link_doctypes: limit links to these doctypes.
    """

    filters = [["fieldtype", "=", "Dynamic Link"]]

    filters_for_docfield = filters[:]
    filters_for_customfield = filters[:]

    if limit_link_doctypes:
        filters_for_docfield += [["parent", "in", tuple(limit_link_doctypes)]]
        filters_for_customfield += [["dt", "in", tuple(limit_link_doctypes)]]

    links = frappe.get_all(
        "DocField",
        fields=["parent as doctype", "fieldname", "options as doctype_fieldname"],
        filters=filters_for_docfield,
        as_list=1,
        order_by=None,
    )

    links += frappe.get_all(
        "Custom Field",
        fields=["dt as doctype", "fieldname", "options as doctype_fieldname"],
        filters=filters_for_customfield,
        as_list=1,
        order_by=None,
    )

    links_by_doctype = defaultdict(list)
    for doctype, fieldname, doctype_fieldname in links:
        try:
            filters = [[doctype_fieldname, "in", to_doctypes]] if to_doctypes else []
            for linked_to in frappe.get_all(
                doctype,
                pluck=doctype_fieldname,
                filters=filters,
                distinct=1,
            ):
                if linked_to:
                    links_by_doctype[linked_to].append(
                        {"doctype": doctype, "fieldname": fieldname, "doctype_fieldname": doctype_fieldname}
                    )
        except frappe.db.ProgrammingError:
            continue
    return links_by_doctype


@frappe.whitelist()
def get_linked_doctypes(doctype: str, without_ignore_user_permissions_enabled: int | bool = False):
    """add list of doctypes this doctype is 'linked' with.

    Example, for Customer:

            {"Address": {"fieldname": "customer"}..}
    """
    if without_ignore_user_permissions_enabled:
        return frappe.cache.hget(
            "linked_doctypes_without_ignore_user_permissions_enabled",
            doctype,
            lambda: _get_linked_doctypes(doctype, without_ignore_user_permissions_enabled),
        )
    else:
        return frappe.cache.hget("linked_doctypes", doctype, lambda: _get_linked_doctypes(doctype))


def _get_linked_doctypes(doctype, without_ignore_user_permissions_enabled=False):
    ret = {}
    ret.update(get_linked_fields(doctype, without_ignore_user_permissions_enabled))
    ret.update(get_dynamic_linked_fields(doctype, without_ignore_user_permissions_enabled))

    filters = [["fieldtype", "in", frappe.model.table_fields], ["options", "=", doctype]]
    if without_ignore_user_permissions_enabled:
        filters.append(["ignore_user_permissions", "!=", 1])
    links = frappe.get_all("DocField", fields=["parent as dt"], filters=filters)
    links += frappe.get_all("Custom Field", fields=["dt"], filters=filters)

    for (dt,) in links:
        if dt in ret:
            continue
        ret[dt] = {"get_parent": True}

    custom_doctypes = frappe.get_all(
        doctype="DocType", filters=[["custom", "=", 1], ["name", "in", list(ret.keys())]], as_list=True
    )

    custom_doctypes = [item[0] for item in custom_doctypes]

    for dt in list(ret):
        if dt in custom_doctypes:
            continue
        try:
            doctype_module = load_doctype_module(dt)
        except (ImportError, KeyError):
            continue

        if getattr(doctype_module, "exclude_from_linked_with", False):
            del ret[dt]

    return ret


def get_linked_fields(doctype, without_ignore_user_permissions_enabled=False):
    filters = [["fieldtype", "=", "Link"], ["options", "=", doctype]]
    if without_ignore_user_permissions_enabled:
        filters.append(["ignore_user_permissions", "!=", 1])

    links = frappe.get_all("DocField", fields=["parent", "fieldname"], filters=filters, as_list=1)
    links += frappe.get_all("Custom Field", fields=["dt as parent", "fieldname"], filters=filters, as_list=1)

    ret = {}

    if not links:
        return ret

    links_dict = defaultdict(list)
    for doctype, fieldname in links:
        links_dict[doctype].append(fieldname)

    for doctype_name in links_dict:
        ret[doctype_name] = {"fieldname": links_dict.get(doctype_name)}
    table_doctypes = frappe.get_all(
        "DocType",
        filters=[["istable", "=", "1"], ["is_virtual", "=", "0"], ["name", "in", tuple(links_dict)]],
    )
    child_filters = [
        ["fieldtype", "in", frappe.model.table_fields],
        ["options", "in", tuple(doctype.name for doctype in table_doctypes)],
    ]
    if without_ignore_user_permissions_enabled:
        child_filters.append(["ignore_user_permissions", "!=", 1])

    for parent, options in frappe.get_all(
        "DocField", fields=["parent", "options"], filters=child_filters, as_list=1
    ):
        child_link = {"child_doctype": options, "fieldname": links_dict[options]}
        if parent in ret and "child_doctype" in ret[parent]:
            if "child_links" not in ret[parent]:
                ret[parent]["child_links"] = [dict(ret[parent])]
            ret[parent]["child_links"].append(child_link)
        elif parent in ret:
            ret[parent].setdefault("child_links", []).append(child_link)
        else:
            ret[parent] = child_link
        ret.pop(options, None)

    virtual_doctypes = frappe.get_all("DocType", {"is_virtual": 1}, pluck="name")
    for dt in virtual_doctypes:
        ret.pop(dt, None)

    return ret


def get_dynamic_linked_fields(doctype, without_ignore_user_permissions_enabled=False):
    ret = {}

    filters = [["fieldtype", "=", "Dynamic Link"]]
    if without_ignore_user_permissions_enabled:
        filters.append(["ignore_user_permissions", "!=", 1])

    links = frappe.get_all(
        "DocField",
        fields=["parent as doctype", "fieldname", "options as doctype_fieldname"],
        filters=filters,
    )
    links += frappe.get_all(
        "Custom Field",
        fields=["dt as doctype", "fieldname", "options as doctype_fieldname"],
        filters=filters,
    )

    for df in links:
        if _is_single(df.doctype):
            continue

        meta = frappe.get_meta(df.doctype)
        if meta.is_virtual:
            continue

        is_child = meta.istable
        possible_link = frappe.get_all(
            df.doctype,
            filters={df.doctype_fieldname: doctype},
            fields=["parenttype"] if is_child else None,
            distinct=True,
        )

        if not possible_link:
            continue

        if is_child:
            for d in possible_link:
                ret[d.parenttype] = {
                    "child_doctype": df.doctype,
                    "fieldname": [df.fieldname],
                    "doctype_fieldname": df.doctype_fieldname,
                }
        else:
            ret[df.doctype] = {"fieldname": [df.fieldname], "doctype_fieldname": df.doctype_fieldname}

    return ret


def _is_single(doctype):
    return bool(frappe.get_meta(doctype).get("issingle"))
