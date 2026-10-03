# Ported from Frappe's generic core "Comment" doctype (frappe/frappe, MIT) --
# frappe.desk.form.utils.add_comment / crm/api/comment.py's add_comment
# wrapper. Doctype-agnostic: reference_doctype/reference_name point at any
# Lead/Deal/etc. Mention notifications (crm.api.comment.notify_mentions) are
# not ported -- no CRM Notification subsystem exists in this port.
from django.conf import settings
from django.db import models


class Comment(models.Model):
    reference_doctype = models.CharField(max_length=140)
    reference_name = models.CharField(max_length=140)
    content = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "core_comment"
        verbose_name = "Comment"
        ordering = ["creation"]

    def __str__(self):
        return f"Comment on {self.reference_doctype} {self.reference_name}"
