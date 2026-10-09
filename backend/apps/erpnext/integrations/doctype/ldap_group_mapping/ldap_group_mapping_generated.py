from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LdapGroupMappingGenerated(FrappeChildModel):
    doctype = 'LDAP Group Mapping'
    ldap_group = models.CharField(max_length=140, blank=True, null=True, default='')
    erpnext_role = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
