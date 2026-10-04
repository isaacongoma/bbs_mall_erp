common_default_keys = ["__default", "__global"]


def clear_defaults_cache(user=None):
    return None


def clear_doctype_cache(doctype=None):
    return None


def clear_user_cache(user=None):
    return None


def clear_controller_cache(doctype=None):
    return None


def clear_global_cache():
    return None


def clear_meta_cache(doctype=None):
    return None


def get_doctype_map(doctype, name, filters=None, order_by=None):
    return frappe.client_cache.get_value(
        get_doctype_map_key(doctype, name),
        generator=lambda: frappe.get_all(doctype, filters=filters, order_by=order_by, ignore_ddl=True),
    )


def clear_doctype_map(doctype, name="*"):
    frappe.client_cache.delete_keys(get_doctype_map_key(doctype, name))


def build_table_count_cache():
    if (
        frappe.flags.in_patch
        or frappe.flags.in_install
        or frappe.flags.in_migrate
        or frappe.flags.in_import
        or frappe.flags.in_setup_wizard
    ):
        return

    if frappe.db.db_type != "sqlite":
        table_name = frappe.qb.Field("table_name").as_("name")
        table_rows = frappe.qb.Field("table_rows").as_("count")
        information_schema = frappe.qb.Schema("information_schema")

        query = frappe.qb.from_(information_schema.tables).select(table_name, table_rows)
        if frappe.db.db_type == "postgres":
            query = query.where(frappe.qb.Field("schemaname") == frappe.db.db_schema)
        else:
            query = query.where(information_schema.tables.table_schema == frappe.db.cur_db_name)
        data = query.run(as_dict=True)
        counts = {d.get("name").replace("tab", "", 1): d.get("count", None) for d in data}
        frappe.cache.set_value("information_schema:counts", counts)
    else:
        counts = {}
        name = frappe.qb.Field("name")
        type = frappe.qb.Field("type")
        sqlite_master = frappe.qb.Schema("sqlite_master")
        data = frappe.qb.from_(sqlite_master).select(name).where(type == "table").run(as_dict=True)
        for table in data:
            count = frappe.db.sql(f"SELECT COUNT(*) FROM `{table.name}`")[0][0]
            counts[table.name.replace("tab", "", 1)] = count
        frappe.cache.set_value("information_schema:counts", counts)

    return counts
