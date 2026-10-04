from __future__ import annotations

from collections import defaultdict

import apps.frappe as frappe
from apps.frappe.model.dynamic_links import get_dynamic_link_map
from apps.frappe.model.naming import is_autoincremented, validate_name
from apps.frappe.runtime import resolve_model
from apps.frappe.utils.data import cint, cstr, sbool


def _scheduler_inactive():
    if frappe.conf.maintenance_mode or frappe.conf.pause_scheduler or frappe.conf.disable_scheduler:
        return True
    return not frappe.get_system_settings("enable_scheduler")


def _model(doctype):
    try:
        return resolve_model(doctype)
    except LookupError:
        return None


@frappe.whitelist(methods=["POST"])
def update_document_title(
    *,
    doctype: str,
    docname: str,
    title: str | None = None,
    name: str | None = None,
    merge: bool = False,
    enqueue: bool = False,
    **kwargs,
):
    updated_title = kwargs.get("new_title") or title
    updated_name = kwargs.get("new_name") or name

    for obj in [docname, updated_title, updated_name]:
        if not isinstance(obj, (str, type(None))):
            frappe.throw(f"{obj=} must be of type str or None")

    merge = sbool(merge)
    enqueue = sbool(enqueue)
    action_enqueued = enqueue and not _scheduler_inactive()

    doc = frappe.get_doc(doctype, docname)
    doc.check_permission(permtype="write")

    title_field = doc.meta.get_title_field()
    title_updated = updated_title and (title_field != "name") and (updated_title != doc.get(title_field))
    name_updated = updated_name and (updated_name != doc.name)
    queue = kwargs.get("queue") or "long"

    if name_updated:
        if action_enqueued:
            current_name = doc.name
            transformed_name = doc.run_method("before_rename", current_name, updated_name, merge)
            if isinstance(transformed_name, dict):
                transformed_name = transformed_name.get("new")
            transformed_name = transformed_name or updated_name
            doc.queue_action("rename", name=transformed_name, merge=merge, queue=queue, timeout=36000)
        else:
            doc.rename(updated_name, merge=merge)

    if title_updated:
        if action_enqueued and name_updated:
            frappe.enqueue(
                "frappe.client.set_value",
                doctype=doc.doctype,
                name=updated_name,
                fieldname=title_field,
                value=updated_title,
            )
        else:
            try:
                setattr(doc, title_field, updated_title)
                doc.save()
                frappe.msgprint(frappe._("Saved"), alert=True, indicator="green")
            except Exception as e:
                if frappe.db.is_duplicate_entry(e):
                    frappe.throw(
                        frappe._("{0} {1} already exists").format(doctype, frappe.bold(docname)),
                        title=frappe._("Duplicate Name"),
                        exc=frappe.DuplicateEntryError,
                    )
                raise

    return doc.name


def rename_doc(
    doctype: str | None = None,
    old: str | int | None = None,
    new: str | int | None = None,
    force: bool = False,
    merge: bool = False,
    ignore_permissions: bool = False,
    ignore_if_exists: bool = False,
    show_alert: bool = True,
    rebuild_search: bool = True,
    doc=None,
    validate: bool = True,
) -> str:
    old_usage_style = doctype and old and new
    new_usage_style = doc and new

    if not (new_usage_style or old_usage_style):
        raise TypeError(
            "{doctype, old, new} or {doc, new} are required arguments for frappe.model.rename_doc"
        )

    old = old or doc.name
    doctype = doctype or doc.doctype
    assert doctype and old, "doctype and old name must be resolved from arguments or the passed doc"
    force = sbool(force)
    merge = sbool(merge)
    meta = frappe.get_meta(doctype)

    if meta.naming_rule == "Autoincrement":
        old = cint(old)
        new = cint(new)

    if validate:
        old_doc = doc or frappe.get_doc(doctype, old)
        out = old_doc.run_method("before_rename", old, new, merge) or {}
        new = (out.get("new") or new) if isinstance(out, dict) else (out or new)
        new = validate_rename(
            doctype=doctype,
            old=old,
            new=new,
            meta=meta,
            merge=merge,
            force=force,
            ignore_permissions=ignore_permissions,
            ignore_if_exists=ignore_if_exists,
            old_doc=old_doc,
        )

    if not merge:
        rename_parent_and_child(doctype, old, new, meta)
    else:
        update_assignments(old, new, doctype)

    link_fields = get_link_fields(doctype)
    update_link_field_values(link_fields, old, new, doctype)
    rename_dynamic_links(doctype, old, new)
    update_user_settings(old, new, link_fields)

    if doctype == "DocType":
        rename_doctype(doctype, old, new)
        update_customizations(old, new)

    update_attachments(doctype, old, new)
    rename_versions(doctype, old, new)

    new_doc = frappe.get_doc(doctype, new)
    if validate:
        new_doc._local = getattr(old_doc, "_local", None)
    new_doc.run_method("after_rename", old, new, merge)
    new_doc.run_method("on_rename", old, new, merge)

    if not merge:
        rename_password(doctype, old, new)

    if merge:
        new_doc.add_comment(
            "Edit", frappe._("merged {0} into {1}").format(frappe.bold(old), frappe.bold(new))
        )
    else:
        new_doc.add_comment(
            "Edit", frappe._("renamed from {0} to {1}").format(frappe.bold(old), frappe.bold(new))
        )

    if merge:
        frappe.delete_doc(doctype, old, ignore_permissions=ignore_permissions)

    new_doc.clear_cache()
    frappe.clear_cache()
    if rebuild_search:
        frappe.enqueue("frappe.utils.global_search.rebuild_for_doctype", doctype=doctype)

    if show_alert:
        frappe.msgprint(
            frappe._("Document renamed from {0} to {1}").format(frappe.bold(old), frappe.bold(new)),
            alert=True,
            indicator="green",
        )

    frappe.publish_realtime(
        event="doc_rename",
        message={"doctype": doctype, "old": old, "new": new},
        doctype=doctype,
        docname=old,
        after_commit=True,
    )

    return new


def update_assignments(old: str, new: str, doctype: str) -> None:
    model = resolve_model(doctype)
    if not any(field.name == "_assign" for field in model._meta.fields):
        return
    old_assignments = frappe.parse_json(frappe.db.get_value(doctype, old, "_assign")) or []
    new_assignments = frappe.parse_json(frappe.db.get_value(doctype, new, "_assign")) or []
    common_assignments = list(set(old_assignments).intersection(new_assignments))

    for user in common_assignments:
        todos = frappe.get_all(
            "ToDo",
            {
                "owner": user,
                "reference_type": doctype,
                "reference_name": old,
            },
            ["name", "description"],
        )
        for todo in todos:
            frappe.delete_doc("ToDo", todo.name, force=True)

    unique_assignments = list(set(old_assignments + new_assignments))
    frappe.db.set_value(doctype, new, "_assign", frappe.as_json(unique_assignments, indent=0))


def update_user_settings(old: str, new: str, link_fields: list[dict]) -> None:
    model = _model("__UserSettings")
    if model is None or not link_fields:
        return
    linked_doctypes = {d["parent"] for d in link_fields if not d["issingle"]}
    if not linked_doctypes:
        return
    rows = list(model.objects.filter(doctype__in=linked_doctypes, data__contains=cstr(old)).values("user", "doctype", "data"))
    grouped = defaultdict(list)
    for row in rows:
        grouped[row["doctype"]].append(row)
    for fields in link_fields:
        for row in grouped.get(fields["parent"], []):
            data = row["data"] or ""
            if cstr(old) not in data:
                continue
            model.objects.filter(user=row["user"], doctype=row["doctype"]).update(data=data.replace(cstr(old), cstr(new)))


def update_customizations(old: str, new: str) -> None:
    if _model("Custom DocPerm") is None:
        return
    frappe.db.set_value("Custom DocPerm", {"parent": old}, "parent", new, update_modified=False)


def update_attachments(doctype: str, old: str, new: str) -> None:
    if doctype == "DocType":
        return
    model = _model("File")
    if model is None:
        return
    model.objects.filter(attached_to_name=old, attached_to_doctype=doctype).update(attached_to_name=new)


def rename_versions(doctype: str, old: str, new: str) -> None:
    model = _model("Version")
    if model is None:
        return
    model.objects.filter(docname=old, ref_doctype=doctype).update(docname=new)


def rename_parent_and_child(doctype: str, old: str, new: str, meta) -> None:
    resolve_model(doctype).objects.filter(pk=old).update(name=new)
    update_autoname_field(doctype, new, meta)
    update_child_docs(old, new, meta)


def update_autoname_field(doctype: str, new: str, meta) -> None:
    autoname = meta.get("autoname") or ""
    field = autoname.split(":")
    if field and field[0] == "field":
        frappe.db.set_value(doctype, new, field[1], new, update_modified=False)


def validate_rename(
    doctype: str,
    old: str | int,
    new: str | int,
    meta,
    merge: bool,
    force: bool = False,
    ignore_permissions: bool = False,
    ignore_if_exists: bool = False,
    save_point=False,
    old_doc=None,
) -> str:
    if meta.issingle:
        frappe.throw(frappe._("Single DocTypes cannot be renamed"))

    save_point_name = None
    if save_point:
        save_point_name = f"validate_rename_{frappe.generate_hash(length=8)}"
        frappe.db.savepoint(save_point_name)

    exists = frappe.db.get_value(doctype, new, "name", for_update=True)

    if not frappe.db.exists(doctype, old):
        frappe.throw(frappe._("Can't rename {0} to {1} because {0} doesn't exist.").format(old, new))

    if old == new:
        frappe.throw(frappe._("No changes made because old and new name are the same.").format(old, new))

    if exists and exists != new:
        exists = None

    if merge and not exists:
        frappe.throw(frappe._("{0} {1} does not exist, select a new target to merge").format(doctype, new))

    if not merge and exists and not ignore_if_exists:
        frappe.throw(frappe._("Another {0} with name {1} exists, select another name").format(doctype, new))

    from apps.frappe.permissions import has_permission

    kwargs = {"doctype": doctype, "ptype": "write", "print_logs": False}
    if old_doc:
        kwargs["doc"] = old_doc

    if not (ignore_permissions or has_permission(**kwargs)):
        frappe.throw(frappe._("You need write permission on {0} {1} to rename").format(doctype, old))

    if merge:
        kwargs["doc"] = frappe.get_doc(doctype, new)
        if not (ignore_permissions or has_permission(**kwargs)):
            frappe.throw(frappe._("You need write permission on {0} {1} to merge").format(doctype, new))

    if not force and not ignore_permissions and not meta.allow_rename:
        frappe.throw(frappe._("{0} not allowed to be renamed").format(frappe._(doctype)))

    new = validate_name(doctype, new)

    if save_point:
        frappe.db.rollback(save_point=save_point_name)

    return new


def rename_doctype(doctype: str, old: str, new: str) -> None:
    for fieldtype in ("Link", "Table", "Table MultiSelect"):
        update_options_for_fieldtype(fieldtype, old, new)
    update_parenttype_values(old, new)
    try:
        meta = frappe.get_meta(new)
    except frappe.DoesNotExistError:
        return
    if is_autoincremented(new, meta):
        update_sequence_name(old, new)


def update_child_docs(old: str, new: str, meta) -> None:
    for df in meta.get_table_fields():
        if not df.options:
            continue
        try:
            child_meta = frappe.get_meta(df.options)
        except frappe.DoesNotExistError:
            continue
        if child_meta.get("is_virtual"):
            continue
        child_model = _model(df.options)
        if child_model is None:
            continue
        child_model.objects.filter(parent=old, parenttype=meta.name).update(parent=new)


def update_link_field_values(link_fields: list[dict], old: str, new: str, doctype: str) -> None:
    for field in link_fields:
        if field["issingle"]:
            try:
                single_doc = frappe.get_doc(field["parent"])
                if single_doc.get(field["fieldname"]) == old:
                    single_doc.set(field["fieldname"], new)
                    single_doc.flags.ignore_mandatory = True
                    single_doc.flags.ignore_links = True
                    single_doc.save(ignore_permissions=True)
            except ImportError:
                pass
        else:
            parent = field["parent"]
            docfield = field["fieldname"]
            if parent == new and doctype == "DocType":
                parent = old
            link_model = _model(parent)
            if link_model is None:
                continue
            frappe.db.set_value(parent, {docfield: cstr(old)}, docfield, cstr(new), update_modified=False)

        if doctype == "DocType" and field["parent"] == old:
            field["parent"] = new


def get_link_fields(doctype: str) -> list[dict]:
    if not frappe.flags.link_fields:
        frappe.flags.link_fields = {}

    if doctype not in frappe.flags.link_fields:
        from apps.erpnext.registry import get_meta, list_doctypes

        standard_fields = []
        for parent in list_doctypes():
            try:
                meta = get_meta(parent)
            except KeyError:
                continue
            if meta.get("is_virtual"):
                continue
            for field in meta.get("fields") or []:
                if field.get("is_virtual"):
                    continue
                if field.get("fieldtype") == "Link" and field.get("options") == doctype:
                    standard_fields.append(
                        frappe._dict(
                            parent=parent,
                            fieldname=field.get("fieldname"),
                            issingle=meta.get("issingle") or 0,
                        )
                    )
        frappe.flags.link_fields[doctype] = standard_fields

    return frappe.flags.link_fields[doctype]


def update_options_for_fieldtype(fieldtype: str, old: str, new: str) -> None:
    from apps.erpnext.registry import get_meta, list_doctypes

    for parent in list_doctypes():
        try:
            meta = get_meta(parent)
        except KeyError:
            continue
        for field in meta.get("fields") or []:
            if field.get("fieldtype") == fieldtype and field.get("options") == old:
                field["options"] = new
    frappe.flags.link_fields = {}


def get_select_fields(old: str, new: str) -> list[dict]:
    from apps.erpnext.registry import get_meta, list_doctypes

    rows = []
    for parent in list_doctypes():
        if parent == new:
            continue
        try:
            meta = get_meta(parent)
        except KeyError:
            continue
        for field in meta.get("fields") or []:
            options = field.get("options") or ""
            if (
                field.get("fieldname") != "fieldtype"
                and field.get("fieldtype") == "Select"
                and old in options
            ):
                rows.append(
                    frappe._dict(
                        parent=parent,
                        fieldname=field.get("fieldname"),
                        issingle=meta.get("issingle") or 0,
                    )
                )
    return rows


def update_select_field_values(old: str, new: str):
    from apps.erpnext.registry import get_meta, list_doctypes

    for parent in list_doctypes():
        if parent == new:
            continue
        try:
            meta = get_meta(parent)
        except KeyError:
            continue
        for field in meta.get("fields") or []:
            options = field.get("options") or ""
            if field.get("fieldtype") != "Select":
                continue
            if f"\n{old}" in options or f"{old}\n" in options:
                field["options"] = options.replace(old, new)
    frappe.flags.link_fields = {}


def update_parenttype_values(old: str, new: str):
    try:
        meta = frappe.get_meta(new)
    except frappe.DoesNotExistError:
        return
    for df in meta.get_table_fields():
        if not df.options:
            continue
        try:
            child_meta = frappe.get_meta(df.options)
        except frappe.DoesNotExistError:
            continue
        if child_meta.get("is_virtual"):
            continue
        child_model = _model(df.options)
        if child_model is None:
            continue
        child_model.objects.filter(parenttype=old).update(parenttype=new)


def update_sequence_name(old: str, new: str, slug: str = "_id_seq"):
    old_sequence_name = frappe.scrub(old + slug)
    new_sequence_name = frappe.scrub(new + slug)
    frappe.db.sql_ddl(f'ALTER SEQUENCE "{old_sequence_name}" RENAME TO "{new_sequence_name}"')


def rename_dynamic_links(doctype: str, old: str, new: str):
    for df in get_dynamic_link_map().get(doctype, []):
        try:
            meta = frappe.get_meta(df.parent)
        except frappe.DoesNotExistError:
            continue
        if meta.is_virtual:
            continue
        if meta.issingle:
            refdoc = frappe.db.get_singles_dict(df.parent)
            if refdoc.get(df.options) == doctype and refdoc.get(df.fieldname) == old:
                singles = _model("Singles")
                if singles is None:
                    continue
                singles.objects.filter(field=df.fieldname, doctype=df.parent, value=old).update(value=new)
        else:
            parent = df.parent if df.parent != new else old
            parent_model = _model(parent)
            if parent_model is None:
                continue
            parent_model.objects.filter(**{df.options: doctype, df.fieldname: old}).update(**{df.fieldname: new})


def rename_password(doctype, old, new):
    model = _model("__Auth")
    if model is None:
        return
    model.objects.filter(doctype=doctype, name=old).update(name=new)


def bulk_rename(doctype: str, rows: list[list] | None = None, via_console: bool = False) -> list[str] | None:
    if not rows:
        frappe.throw(frappe._("Please select a valid csv file with data"))

    if not via_console:
        max_rows = 500
        if len(rows) > max_rows:
            frappe.throw(frappe._("Maximum {0} rows allowed").format(max_rows))

    rename_log = []
    for row in rows:
        if len(row) > 1 and row[0] and row[1]:
            merge = len(row) > 2 and sbool(row[2]) is True
            try:
                if rename_doc(doctype, row[0], row[1], merge=merge, rebuild_search=False):
                    msg = frappe._("Successful: {0} to {1}").format(row[0], row[1])
                    frappe.db.commit()
                else:
                    msg = None
            except Exception as e:
                msg = frappe._("** Failed: {0} to {1}: {2}").format(row[0], row[1], repr(e))
                frappe.db.rollback()

            if msg:
                if via_console:
                    print(msg)
                else:
                    rename_log.append(msg)

    frappe.enqueue("frappe.utils.global_search.rebuild_for_doctype", doctype=doctype)

    if not via_console:
        return rename_log
