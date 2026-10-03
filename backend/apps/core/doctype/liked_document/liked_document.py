# Generic equivalent of Frappe's built-in `_liked_by` field (every doctype
# carries one natively via frappe.desk.like) and frappe.desk.like.toggle_like.
# Not a literal doctype in the original -- ported as the feature, not a file.
from django.conf import settings
from django.db import models


class LikedDocument(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    reference_doctype = models.CharField(max_length=140)
    reference_name = models.CharField(max_length=140)
    creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "core"
        db_table = "liked_document"
        verbose_name = "Liked Document"
        unique_together = [("user", "reference_doctype", "reference_name")]


def toggle_like(user, doctype: str, name: str, add: bool):
    if add:
        LikedDocument.objects.get_or_create(user=user, reference_doctype=doctype, reference_name=name)
    else:
        LikedDocument.objects.filter(user=user, reference_doctype=doctype, reference_name=name).delete()


def get_liked_by(doctype: str, name: str) -> list:
    return list(
        LikedDocument.objects.filter(reference_doctype=doctype, reference_name=name).values_list(
            "user_id", flat=True
        )
    )
