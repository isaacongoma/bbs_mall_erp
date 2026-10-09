from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UserDocumentTypeGenerated(FrappeChildModel):
    doctype = 'User Document Type'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    read = models.SmallIntegerField(default=1)
    write = models.SmallIntegerField(default=0)
    create = models.SmallIntegerField(default=0)
    is_custom = models.SmallIntegerField(default=0)
    submit = models.SmallIntegerField(default=0)
    cancel = models.SmallIntegerField(default=0)
    amend = models.SmallIntegerField(default=0)
    delete = models.SmallIntegerField(default=0)
    email = models.SmallIntegerField(default=1)
    share = models.SmallIntegerField(default=1)
    print_field = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
