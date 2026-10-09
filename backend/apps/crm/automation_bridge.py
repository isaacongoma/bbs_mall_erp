from django.db.models.signals import post_delete, post_save, pre_save

from apps.frappe.automation_engine.dispatch import run_automations

_connected = False


def connect():
    global _connected
    if _connected:
        return
    from django.apps import apps

    for model in apps.get_models():
        if not getattr(model, "doctype_label", None):
            continue
        pre_save.connect(_capture_before, sender=model, weak=False, dispatch_uid=f"automation_pre_{model.__name__}")
        post_save.connect(_on_save, sender=model, weak=False, dispatch_uid=f"automation_post_save_{model.__name__}")
        post_delete.connect(_on_delete, sender=model, weak=False, dispatch_uid=f"automation_post_delete_{model.__name__}")
    _connected = True


def _document_for(instance, values=None):
    from apps.frappe.model.document import Document

    if values is None:
        data = {field.name: getattr(instance, field.name) for field in instance._meta.fields}
        data.update({field.attname: getattr(instance, field.attname) for field in instance._meta.fields})
    else:
        data = dict(values)
    data["doctype"] = instance.doctype_label
    data["name"] = str(instance.pk)
    return Document(data)


def _capture_before(sender, instance, **kwargs):
    if not instance.pk:
        instance._automation_before = None
        return
    instance._automation_before = sender.objects.filter(pk=instance.pk).values().first()


def _has_rules(instance):
    from apps.frappe.automation_engine.registry import get_automations_for

    return bool(get_automations_for(instance.doctype_label))


def _on_save(sender, instance, created, **kwargs):
    if not _has_rules(instance):
        return
    document = _document_for(instance)
    before = getattr(instance, "_automation_before", None)
    if before is not None:
        document._doc_before_save = _document_for(instance, before)
    methods = ("after_insert",) if created else ("on_update", "on_change")
    for method in methods:
        run_automations(document, method)


def _on_delete(sender, instance, **kwargs):
    if not _has_rules(instance):
        return
    run_automations(_document_for(instance), "on_trash")
