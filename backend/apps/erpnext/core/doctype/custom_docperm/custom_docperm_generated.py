from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CustomDocpermGenerated(FrappeModel):
    doctype = 'Custom DocPerm'
    role = models.CharField(max_length=140, blank=True, null=True, default='')
    if_owner = models.SmallIntegerField(default=0)
    permlevel = models.IntegerField(null=True, blank=True)
    read = models.SmallIntegerField(default=1)
    write = models.SmallIntegerField(default=0)
    create = models.SmallIntegerField(default=0)
    delete = models.SmallIntegerField(default=0)
    submit = models.SmallIntegerField(default=0)
    cancel = models.SmallIntegerField(default=0)
    amend = models.SmallIntegerField(default=0)
    mask = models.SmallIntegerField(default=0)
    report = models.SmallIntegerField(default=0)
    export = models.SmallIntegerField(default=1)
    import_field = models.SmallIntegerField(default=0)
    share = models.SmallIntegerField(default=0)
    print_field = models.SmallIntegerField(default=0)
    email = models.SmallIntegerField(default=0)
    parent = models.CharField(max_length=140, blank=True, null=True, default='')
    select = models.SmallIntegerField(default=0)
    is_app_disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
