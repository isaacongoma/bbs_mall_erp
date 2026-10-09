import frappe


def get_query(table, fields=None, filters=None, order_by=None, group_by=None, limit=None, offset=None, distinct=False, ignore_permissions=True, **kwargs):
    from apps.frappe.database.query import Engine
    from apps.frappe.query_builder.builder import Postgres

    try:
        frappe.local.qb
    except AttributeError:
        frappe.local.qb = Postgres
    return Engine().get_query(
        table,
        fields=fields,
        filters=filters,
        order_by=order_by,
        group_by=group_by,
        limit=limit,
        offset=offset,
        distinct=distinct,
        ignore_permissions=ignore_permissions,
        **kwargs,
    )
