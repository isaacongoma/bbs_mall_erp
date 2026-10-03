from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS

from apps.core.models import User
from apps.crm.doctype.sales_hierarchy.sales_hierarchy import SalesHierarchy

RANK = {"Sales Manager": 0, "Sales User": 1}


def role_of(user: User) -> str:
    return "System Manager" if user.is_superuser else ("Sales Manager" if user.is_staff else "Sales User")


class SalesHierarchySerializer(serializers.ModelSerializer):
    user = serializers.SlugRelatedField(slug_field="email", queryset=User.objects.filter(is_active=True))
    reports_to = serializers.PrimaryKeyRelatedField(
        queryset=SalesHierarchy.objects.all(), allow_null=True, required=False
    )
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = SalesHierarchy
        fields = ("name", "user", "full_name", "reports_to", "is_group", "lft", "rgt")
        read_only_fields = ("name", "is_group", "lft", "rgt")

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.email

    def validate(self, attrs):
        user = attrs.get("user") or (self.instance.user if self.instance else None)
        parent = attrs.get("reports_to", self.instance.reports_to if self.instance else None)
        if user is not None and role_of(user) == "System Manager":
            raise ValidationError("Admins are not part of the sales hierarchy")
        if parent is not None:
            if user is not None and parent.user_id == user.pk:
                raise ValidationError("A user cannot report to themselves")
            if self.instance and any(node.pk == parent.pk for node in self.instance.descendants()):
                raise ValidationError("Cannot move a manager under one of their own reports")
            if user is not None and RANK.get(role_of(user), 1) < RANK.get(role_of(parent.user), 1):
                raise ValidationError("A manager cannot report to a sales user")
        return attrs


class SalesHierarchyViewSet(viewsets.ModelViewSet):
    queryset = SalesHierarchy.objects.select_related("user", "reports_to")
    serializer_class = SalesHierarchySerializer
    lookup_field = "name"
    lookup_value_regex = "[^/]+"
    pagination_class = None

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in SAFE_METHODS and not request.user.is_superuser:
            raise PermissionDenied("Only admins can change the sales hierarchy")
