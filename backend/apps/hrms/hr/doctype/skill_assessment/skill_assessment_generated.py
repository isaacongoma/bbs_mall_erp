from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SkillAssessmentGenerated(FrappeChildModel):
    doctype = 'Skill Assessment'
    skill = models.CharField(max_length=140, blank=True, null=True, default='')
    rating = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
