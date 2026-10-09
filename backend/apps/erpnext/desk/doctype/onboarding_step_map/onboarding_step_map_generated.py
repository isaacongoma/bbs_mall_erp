from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OnboardingStepMapGenerated(FrappeChildModel):
    doctype = 'Onboarding Step Map'
    step = models.CharField(max_length=140, blank=True, null=True, default='')
    is_optional = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
