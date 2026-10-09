from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core import assignment_rules
from apps.core.doctype.assignment_rule.assignment_rule_serializer import AssignmentRuleSerializer
from apps.core.identity import user_email, user_pk

SCALAR_FIELDS = (
    "document_type", "due_date_based_on", "priority", "disabled", "description", "rule",
    "assign_condition", "unassign_condition", "close_condition",
    "assign_condition_json", "unassign_condition_json", "field",
)


def _normalize_users(value) -> list[dict]:
    out = []
    for row in value or []:
        if isinstance(row, dict):
            out.append({"user": row.get("user"), "weight": row.get("weight", 1)})
        elif row:
            out.append({"user": row, "weight": 1})
    return out


def _resolve_user_id(identifier):
    if isinstance(identifier, int) or str(identifier).isdigit():
        from apps.core.identity import user_emails_by_pk

        email = user_emails_by_pk([int(identifier)]).get(int(identifier))
        if email:
            return user_pk(email)
    return user_pk(identifier)


def _set_child_rows(rule, data: dict, owner: str):
    if "assignment_days" in data:
        days = []
        for row in data.get("assignment_days") or []:
            day = row.get("day") if isinstance(row, dict) else row
            if day:
                days.append(day)
        assignment_rules.replace_days(rule.name, days, owner)
    for table in assignment_rules.USER_TABLES:
        if table in data:
            rows = []
            for row in _normalize_users(data.get(table)):
                user_id = _resolve_user_id(row["user"]) if row["user"] else None
                if user_id:
                    rows.append((user_id, row["weight"]))
            assignment_rules.replace_users(rule.name, table, rows, owner)


def _scalar_values(data, only_present=False):
    values = {}
    for field in SCALAR_FIELDS:
        if only_present and field not in data:
            continue
        value = data.get(field)
        if field == "disabled":
            value = 1 if value else 0
        elif field == "priority":
            value = value or 0
        elif field == "description":
            value = value or "Automatic Assignment"
        elif value is None:
            value = ""
        values[field] = value
    return values


class AssignmentRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentRuleSerializer
    lookup_field = "name"
    filterset_fields = ("document_type", "disabled")

    def get_queryset(self):
        return assignment_rules.rule_model().objects.all().order_by("-priority", "-creation")

    def create(self, request, *args, **kwargs):
        data = request.data
        owner = user_email(request.user) or "Administrator"
        now = timezone.now()
        rule = assignment_rules.rule_model().objects.create(
            name=data.get("name") or data.get("assignment_rule_name"),
            owner=owner, modified_by=owner, creation=now, modified=now,
            **_scalar_values(data),
        )
        _set_child_rows(rule, data, owner)
        return Response(self.get_serializer(rule).data, status=201)

    def update(self, request, *args, **kwargs):
        rule = self.get_object()
        data = request.data
        for field, value in _scalar_values(data, only_present=True).items():
            setattr(rule, field, value)
        rule.modified = timezone.now()
        rule.save()
        _set_child_rows(rule, data, user_email(request.user) or "Administrator")
        return Response(self.get_serializer(rule).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        assignment_rules.user_row_model().objects.filter(parent=name).delete()
        assignment_rules.day_row_model().objects.filter(parent=name).delete()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_assignment_rules_list(request):
    rules = assignment_rules.rule_model().objects.filter(document_type__in=["CRM Lead", "CRM Deal"]).values(
        "name", "description", "disabled", "priority"
    )
    return Response(
        [
            {**rule, "disabled": bool(rule["disabled"]), "users_exists": assignment_rules.has_users(rule["name"])}
            for rule in rules
        ]
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def duplicate_assignment_rule(request):
    rule = assignment_rules.rule_model().objects.get(pk=request.data.get("docname"))
    new_rule = assignment_rules.duplicate_rule(rule, request.data.get("new_name"), user_email(request.user) or "Administrator")
    return Response(AssignmentRuleSerializer(new_rule).data)
