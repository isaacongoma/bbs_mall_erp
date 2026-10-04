from __future__ import annotations

from typing import Any

import apps.frappe as frappe
from apps.frappe.model.docstatus import DocStatus
from apps.frappe.model.dynamic_links import get_dynamic_link_map
from apps.frappe.model.naming import revert_series_if_last
from apps.frappe.model.rename_doc import get_link_fields
from apps.frappe.runtime import resolve_model
from apps.frappe.utils.data import get_link_to_form


def delete_doc(
    doctype: str | None = None,
    name: str | int | list[str | int] | None = None,
    force: int | bool = 0,
    ignore_doctypes: list[str] | None = None,
    for_reload: bool = False,
    ignore_permissions: bool = False,
    flags: dict[str, Any] | None = None,
    ignore_on_trash: bool = False,
    ignore_missing: bool = True,
    delete_permanently: bool = False,
) -> bool | None:
    if not ignore_doctypes:
        ignore_doctypes = []

    if not doctype:
        doctype = frappe.form_dict.get("dt")
        name = frappe.form_dict.get("dn")

    is_virtual = _is_virtual_doctype(doctype)

    names = name
    if isinstance(name, str) or isinstance(name, int):
        names = [name]

    for name in names or []:
        if is_virtual:
            doc = frappe.get_doc(doctype, name)
            update_flags(doc, flags, ignore_permissions)
            check_permission_and_not_submitted(doc)
            from apps.frappe.model.document import Document

            if type(doc).delete == Document.delete:
                frappe.throw(_("{0} is a Virtual DocType and must implement its own delete() method.").format(doctype))
            doc.flags.ignore_on_trash = ignore_on_trash
            doc.delete()
            continue

        if not frappe.db.exists(doctype, name):
            if not ignore_missing:
                raise frappe.DoesNotExistError(doctype=doctype)
            else:
                return False

        doc = None
        if doctype == "DocType":
            custom_field_parents = []
            if for_reload:
                try:
                    doc = frappe.get_doc(doctype, name)
                except frappe.DoesNotExistError:
                    pass
                else:
                    doc.run_method("before_reload")
            else:
                doc = frappe.get_doc(doctype, name)
                if not (doc.custom or frappe.conf.developer_mode or frappe.flags.in_patch or force):
                    frappe.throw(_("Standard DocType can not be deleted."))
                update_flags(doc, flags, ignore_permissions)
                check_permission_and_not_submitted(doc)
                try:
                    custom_field_parents = frappe.get_all(
                        "Custom Field",
                        filters={"options": name, "fieldtype": ("in", frappe.model.table_fields)},
                        pluck="dt",
                    )
                    frappe.db.delete("Custom Field", {"options": name, "fieldtype": ("in", frappe.model.table_fields)})
                except LookupError:
                    custom_field_parents = []
                try:
                    frappe.db.delete("__global_search", {"doctype": name})
                except LookupError:
                    pass
            delete_from_table(doctype, name, ignore_doctypes, None)
            frappe.clear_cache(doctype=name)
            for parent_doctype in custom_field_parents:
                frappe.clear_cache(doctype=parent_doctype)
        else:
            try:
                frappe.db.get_value(doctype, name, for_update=True, wait=False)
            except (frappe.QueryTimeoutError, frappe.QueryDeadlockError) as error:
                frappe.throw(
                    _(
                        "This document can not be deleted right now as it's being modified by another user. Please try again after some time."
                    ),
                    exc=type(error),
                )
            doc = frappe.get_doc(doctype, name)

            if not for_reload:
                update_flags(doc, flags, ignore_permissions)
                check_permission_and_not_submitted(doc)
                doc.flags.force_delete = force

                if not ignore_on_trash:
                    doc.run_method("on_trash")
                    doc.flags.in_delete = True
                    doc.run_method("on_change")

                if not force:
                    try:
                        check_if_doc_is_linked(doc)
                        check_if_doc_is_dynamically_linked(doc)
                    except frappe.LinkExistsError as e:
                        if doc.meta.has_field("enabled") or doc.meta.has_field("disabled"):
                            frappe.throw(
                                _("You can disable this {0} instead of deleting it.").format(_(doctype)),
                                frappe.LinkExistsError,
                            )
                        else:
                            raise e

            update_naming_series(doc)
            delete_from_table(doctype, name, ignore_doctypes, doc)
            doc.run_method("after_delete")

            remove_all(doctype, name, from_delete=True, delete_permanently=delete_permanently)

            if not for_reload:
                frappe.enqueue(
                    "frappe.model.delete_doc.delete_dynamic_links",
                    doctype=doc.doctype,
                    name=doc.name,
                    now=(
                        frappe.in_test
                        or frappe.flags.in_install
                        or frappe.flags.in_migrate
                        or frappe.flags.in_setup_wizard
                    ),
                    enqueue_after_commit=True,
                )

        delete_all_passwords_for(doctype, name)

        if doc:
            doc.clear_cache()
        delete_for_document(doc)
        delete_tags_for_document(doc)

        if for_reload:
            delete_permanently = True

        if not delete_permanently:
            add_to_deleted_document(doc)

        if doc and not for_reload:
            if not frappe.flags.in_patch:
                try:
                    doc.notify_update()
                    insert_feed(doc)
                except ImportError:
                    pass


def add_to_deleted_document(doc):
    if not doc or doc.doctype == "Deleted Document" or frappe.flags.in_install == "frappe":
        return
    try:
        resolve_model("Deleted Document")
    except LookupError:
        return
    frappe.get_doc(
        doctype="Deleted Document",
        deleted_doctype=doc.doctype,
        deleted_name=doc.name,
        data=doc.as_json(),
        owner=frappe.session.user,
    ).db_insert()


def update_naming_series(doc):
    if not doc or not doc.meta.autoname:
        return
    if doc.meta.autoname.startswith("naming_series:") and getattr(doc, "naming_series", None):
        revert_series_if_last(doc.naming_series, doc.name, doc)
    elif doc.meta.autoname.split(":", 1)[0] not in ("Prompt", "field", "hash", "autoincrement"):
        revert_series_if_last(doc.meta.autoname, doc.name, doc)


def delete_from_table(doctype: str, name: str, ignore_doctypes: list[str], doc):
    if doctype != "DocType" and doctype == name:
        frappe.db.delete("Singles", {"doctype": name})
    else:
        frappe.db.delete(doctype, {"name": name})

    child_doctypes = []
    if doc:
        for child_field in doc.meta.get_table_fields():
            try:
                child_meta = frappe.get_meta(child_field.options)
            except frappe.DoesNotExistError:
                continue
            if not child_meta.is_virtual:
                child_doctypes.append(child_field.options)
    else:
        try:
            child_doctypes = frappe.get_all(
                "DocField",
                filters={"fieldtype": ["in", list(frappe.model.table_fields)], "parent": doctype},
                pluck="options",
            )
        except LookupError:
            child_doctypes = []

    child_doctypes_to_delete = set(child_doctypes) - set(ignore_doctypes)
    for child_doctype in child_doctypes_to_delete:
        try:
            frappe.db.delete(child_doctype, {"parenttype": doctype, "parent": name})
        except LookupError:
            continue


def update_flags(doc, flags=None, ignore_permissions=False):
    if ignore_permissions:
        if not flags:
            flags = {}
        flags["ignore_permissions"] = ignore_permissions

    if flags:
        doc.flags.update(flags)


def check_permission_and_not_submitted(doc):
    if not doc.flags.ignore_permissions and frappe.session.user != "Administrator":
        if doc.doctype == "DocType" and not getattr(doc, "custom", None):
            frappe.throw(_("Only the Administrator can delete a standard DocType."))
        else:
            doc.check_permission("delete")

    if doc.meta.is_submittable and doc.docstatus.is_submitted():
        frappe.msgprint(
            _("{0} {1}: Submitted Record cannot be deleted. You must {2} Cancel {3} it first.").format(
                _(doc.doctype),
                doc.name,
                "<a href='https://docs.frappe.io/erpnext/user/manual/en/delete-submitted-document' target='_blank'>",
                "</a>",
            ),
            raise_exception=True,
        )


class LinkedDocumentsOverflow(Exception):
    pass


def get_linked_docs(doc, method="Delete", limit: int | None = None) -> list[dict]:
    link_fields = get_link_fields(doc.doctype)
    ignored_doctypes = set()

    if method == "Cancel" and (doc_ignore_flags := doc.get("ignore_linked_doctypes")):
        ignored_doctypes.update(doc_ignore_flags)
    if method == "Delete":
        ignored_doctypes.update(frappe.get_hooks("ignore_links_on_delete") or [])

    linked_docs = []

    for lf in link_fields:
        link_dt, link_field, issingle = lf["parent"], lf["fieldname"], lf["issingle"]
        if link_dt in ignored_doctypes or (link_field == "amended_from" and method == "Cancel"):
            continue

        try:
            meta = frappe.get_meta(link_dt)
        except frappe.DoesNotExistError:
            frappe.clear_last_message()
            continue

        if issingle:
            if frappe.db.get_single_value(link_dt, link_field) == doc.name:
                linked_docs.append({"doc": doc.name, "reference_doctype": link_dt, "reference_docname": link_dt})
            continue

        fields = ["name", "docstatus"]
        if meta.istable:
            fields.extend(["parent", "parenttype"])

        if limit and len(linked_docs) >= limit:
            raise LinkedDocumentsOverflow

        try:
            rows = frappe.db.get_values(
                link_dt,
                {link_field: doc.name},
                fields,
                as_dict=True,
                order_by=None,
                limit=limit,
            )
        except LookupError:
            continue
        if limit and len(rows) >= limit:
            raise LinkedDocumentsOverflow

        for item in rows:
            item_parent = getattr(item, "parent", None)
            linked_parent_doctype = item.parenttype if item_parent else link_dt

            if linked_parent_doctype in ignored_doctypes:
                continue

            if method != "Delete" and (method != "Cancel" or not DocStatus(item.docstatus).is_submitted()):
                continue
            elif link_dt == doc.doctype and (item_parent or item.name) == doc.name:
                continue
            else:
                reference_docname = item_parent or item.name
                linked_docs.append(
                    {
                        "doc": doc.name,
                        "reference_doctype": linked_parent_doctype,
                        "reference_docname": reference_docname,
                    }
                )

    return linked_docs


def check_if_doc_is_linked(doc, method="Delete"):
    links = get_linked_docs(doc, method)
    if links:
        link = links[0]
        raise_link_exists_exception(doc, link["reference_doctype"], link["reference_docname"])


def get_dynamic_linked_docs(doc, method="Delete", limit: int | None = None) -> list[dict]:
    linked_docs = []

    for df in get_dynamic_link_map().get(doc.doctype, []):
        if limit and len(linked_docs) >= limit:
            raise LinkedDocumentsOverflow
        ignore_linked_doctypes = doc.get("ignore_linked_doctypes") or []

        if df.parent in (frappe.get_hooks("ignore_links_on_delete") or []) or (
            df.parent in ignore_linked_doctypes and method == "Cancel"
        ):
            continue

        try:
            meta = frappe.get_meta(df.parent)
        except frappe.DoesNotExistError:
            frappe.clear_last_message()
            continue

        if meta.issingle:
            refdoc = frappe.db.get_singles_dict(df.parent)
            if (
                refdoc.get(df.options) == doc.doctype
                and refdoc.get(df.fieldname) == doc.name
                and (
                    (method == "Delete" and not DocStatus(refdoc.docstatus or 0).is_cancelled())
                    or (method == "Cancel" and DocStatus(refdoc.docstatus or 0).is_submitted())
                )
            ):
                linked_docs.append(
                    {
                        "doc": doc.name,
                        "reference_doctype": df.parent,
                        "reference_docname": df.parent,
                        "at_position": "",
                    }
                )
        else:
            try:
                model = resolve_model(df.parent)
            except LookupError:
                continue
            query = model.objects.filter(**{df.options: doc.doctype, df.fieldname: doc.name})
            if method == "Delete":
                query = query.exclude(docstatus=DocStatus.cancelled())
                if df.parent == "Submission Queue" and _model_has_field(model, "status"):
                    query = query.filter(status="Queued")
            elif method == "Cancel":
                query = query.filter(docstatus=DocStatus.submitted())
            if limit:
                query = query[:limit]
            field_names = ["name", "docstatus"]
            if meta.istable:
                field_names.extend(["parent", "parenttype", "idx"])
            rows = [frappe._dict(row) for row in query.values(*field_names)]
            if limit and len(rows) >= limit:
                raise LinkedDocumentsOverflow
            for refdoc in rows:
                if (method == "Delete" and not DocStatus(refdoc.docstatus).is_cancelled()) or (
                    method == "Cancel" and DocStatus(refdoc.docstatus).is_submitted()
                ):
                    reference_doctype = refdoc.parenttype if meta.istable else df.parent
                    reference_docname = refdoc.parent if meta.istable else refdoc.name

                    if reference_doctype in (frappe.get_hooks("ignore_links_on_delete") or []) or (
                        reference_doctype in ignore_linked_doctypes and method == "Cancel"
                    ):
                        continue

                    at_position = f"at Row: {refdoc.idx}" if meta.istable else ""
                    linked_docs.append(
                        {
                            "doc": doc.name,
                            "reference_doctype": reference_doctype,
                            "reference_docname": reference_docname,
                            "at_position": at_position,
                        }
                    )

    return linked_docs


def check_if_doc_is_dynamically_linked(doc, method="Delete"):
    links = get_dynamic_linked_docs(doc, method)
    if links:
        link = links[0]
        raise_link_exists_exception(doc, link["reference_doctype"], link["reference_docname"], link["at_position"])


def raise_link_exists_exception(doc, reference_doctype, reference_docname, row=""):
    doc_link = get_link_to_form(doc.doctype, doc.name, doc.name)
    reference_link = get_link_to_form(reference_doctype, reference_docname, reference_docname)

    if reference_doctype == reference_docname:
        reference_doctype = ""

    frappe.throw(
        _("Cannot delete or cancel because {0} {1} is linked with {2} {3} {4}").format(
            _(doc.doctype), doc_link, _(reference_doctype), reference_link, row
        ),
        frappe.LinkExistsError,
    )


def delete_dynamic_links(doctype, name):
    delete_references("Submission Queue", doctype, name, "ref_doctype", "ref_docname")
    delete_references("ToDo", doctype, name, "reference_type")
    delete_references("Email Unsubscribe", doctype, name)
    delete_references("DocShare", doctype, name, "share_doctype", "share_name")
    delete_references("Version", doctype, name, "ref_doctype", "docname")
    delete_references("Comment", doctype, name)
    delete_references("View Log", doctype, name)
    delete_references("Document Follow", doctype, name, "ref_doctype", "ref_docname")
    delete_references("Notification Log", doctype, name, "document_type", "document_name")
    clear_timeline_references(doctype, name)
    clear_references("Communication", doctype, name)
    clear_references("Activity Log", doctype, name)
    clear_references("Activity Log", doctype, name, "timeline_doctype", "timeline_name")


def delete_references(
    doctype,
    reference_doctype,
    reference_name,
    reference_doctype_field="reference_doctype",
    reference_name_field="reference_name",
):
    try:
        frappe.db.delete(doctype, {reference_doctype_field: reference_doctype, reference_name_field: reference_name})
    except LookupError:
        return


def clear_references(
    doctype,
    reference_doctype,
    reference_name,
    reference_doctype_field="reference_doctype",
    reference_name_field="reference_name",
):
    try:
        model = resolve_model(doctype)
    except LookupError:
        return
    model.objects.filter(
        **{reference_doctype_field: reference_doctype, reference_name_field: reference_name}
    ).update(**{reference_doctype_field: None, reference_name_field: None})


def clear_timeline_references(link_doctype, link_name):
    try:
        frappe.db.delete("Communication Link", {"link_doctype": link_doctype, "link_name": link_name})
    except LookupError:
        return


def insert_feed(doc):
    if (
        not doc
        or frappe.flags.in_install
        or frappe.flags.in_uninstall
        or frappe.flags.in_import
        or getattr(doc, "no_feed_on_delete", False)
    ):
        return
    try:
        resolve_model("Comment")
        comment_meta = frappe.get_meta("Comment")
    except (LookupError, frappe.DoesNotExistError):
        return
    if not comment_meta.has_field("comment_type"):
        return
    from frappe.utils import get_fullname

    frappe.get_doc(
        {
            "doctype": "Comment",
            "comment_type": "Deleted",
            "reference_doctype": doc.doctype,
            "subject": f"{_(doc.doctype)} {doc.name}",
            "full_name": get_fullname(doc.owner),
        }
    ).insert(ignore_permissions=True)


def remove_all(doctype, name, from_delete=False, delete_permanently=False):
    try:
        model = resolve_model("File")
    except LookupError:
        return
    filters = {}
    if _model_has_field(model, "attached_to_doctype"):
        filters["attached_to_doctype"] = doctype
        filters["attached_to_name"] = name
    if filters:
        model.objects.filter(**filters).delete()


def delete_for_document(doc):
    if not doc:
        return
    try:
        frappe.db.delete("__global_search", {"doctype": doc.doctype, "name": doc.name})
    except LookupError:
        return


def delete_tags_for_document(doc):
    if not doc:
        return
    try:
        frappe.db.delete("Tag Link", {"document_type": doc.doctype, "document_name": doc.name})
    except LookupError:
        return


def delete_all_passwords_for(doctype, name):
    try:
        frappe.db.delete("__Auth", {"doctype": doctype, "name": name})
    except LookupError:
        return


def _is_virtual_doctype(doctype):
    if not doctype:
        return False
    try:
        meta = frappe.get_meta(doctype)
    except frappe.DoesNotExistError:
        return False
    return bool(meta.get("is_virtual"))


def _model_has_field(model, fieldname):
    return any(field.name == fieldname for field in model._meta.fields)


def _(message, *args, **kwargs):
    return frappe._(message, *args, **kwargs)
