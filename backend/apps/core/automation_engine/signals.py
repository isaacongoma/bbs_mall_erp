# Django-native replacement for Frappe's doc_events hooks -- real Frappe wires
# run_automations into every doctype's after_insert/on_update/on_change/on_trash automatically
# via the framework; Django has no such generic hook, so this connects pre_save/post_save/
# post_delete once for every doctype in apps.crm.doctype_registry (the fixed set this port
# actually models) instead of touching each model's save() individually.
from __future__ import annotations

from django.db.models.signals import post_delete, post_save, pre_save

from apps.core.automation_engine import dispatch

_connected = False


def connect():
    global _connected
    if _connected:
        return
    from apps.crm.doctype_registry import _registry

    for model in set(_registry().values()):
        pre_save.connect(_capture_before, sender=model, weak=False, dispatch_uid=f"automation_pre_{model.__name__}")
        post_save.connect(_on_save, sender=model, weak=False, dispatch_uid=f"automation_post_save_{model.__name__}")
        post_delete.connect(_on_delete, sender=model, weak=False, dispatch_uid=f"automation_post_delete_{model.__name__}")
    _connected = True


def _capture_before(sender, instance, **kwargs):
    if not instance.pk:
        instance._automation_before = None
        return
    before = sender.objects.filter(pk=instance.pk).values().first()
    instance._automation_before = before


def _on_save(sender, instance, created, **kwargs):
    doctype = getattr(instance, "doctype_label", None)
    if not doctype:
        return
    user_id = getattr(instance, "owner_id", None) or getattr(instance, "modified_by_id", None)
    trigger_type = dispatch.CREATED if created else dispatch.UPDATED
    dispatch.run_automations(doctype, instance, trigger_type, getattr(instance, "_automation_before", None), user_id)
    if not created:
        before = getattr(instance, "_automation_before", None)
        if before is not None:
            dispatch.run_automations(doctype, instance, dispatch.FIELD_CHANGED, before, user_id)


def _on_delete(sender, instance, **kwargs):
    doctype = getattr(instance, "doctype_label", None)
    if not doctype:
        return
    user_id = getattr(instance, "owner_id", None)
    dispatch.run_automations(doctype, instance, dispatch.DELETED, None, user_id)
