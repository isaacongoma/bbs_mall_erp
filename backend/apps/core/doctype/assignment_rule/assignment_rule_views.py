from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.doctype.assignment_rule.assignment_rule import AssignmentRule, AssignmentRuleDay, AssignmentRuleUser
from apps.core.doctype.assignment_rule.assignment_rule_serializer import AssignmentRuleSerializer


def _normalize_users(value) -> list[dict]:
    """users/weighted_users arrive as either a list of user-id strings or a
    list of {user, weight} dicts, depending on which control set them --
    accept both."""
    out = []
    for row in value or []:
        if isinstance(row, dict):
            out.append({"user": row.get("user"), "weight": row.get("weight", 1)})
        elif row:
            out.append({"user": row, "weight": 1})
    return out


def _resolve_user_id(identifier):
    from apps.core.models import User

    if isinstance(identifier, int) or str(identifier).isdigit():
        found = User.objects.filter(pk=int(identifier)).first()
        if found:
            return found.pk
    found = User.objects.filter(email=identifier).first()
    return found.pk if found else None


def _set_child_rows(rule: AssignmentRule, data: dict):
    if "assignment_days" in data:
        rule.day_rows.all().delete()
        for idx, row in enumerate(data.get("assignment_days") or []):
            day = row.get("day") if isinstance(row, dict) else row
            if day:
                AssignmentRuleDay.objects.create(parent_rule=rule, idx=idx, day=day)

    if "users" in data:
        rule.user_rows.filter(table_field="users").delete()
        for idx, row in enumerate(_normalize_users(data.get("users"))):
            user_id = _resolve_user_id(row["user"]) if row["user"] else None
            if user_id:
                AssignmentRuleUser.objects.create(
                    parent_rule=rule, table_field="users", idx=idx, user_id=user_id, weight=row["weight"],
                )

    if "weighted_users" in data:
        rule.user_rows.filter(table_field="weighted_users").delete()
        for idx, row in enumerate(_normalize_users(data.get("weighted_users"))):
            user_id = _resolve_user_id(row["user"]) if row["user"] else None
            if user_id:
                AssignmentRuleUser.objects.create(
                    parent_rule=rule, table_field="weighted_users", idx=idx, user_id=user_id, weight=row["weight"],
                )


class AssignmentRuleViewSet(viewsets.ModelViewSet):
    queryset = AssignmentRule.objects.select_related("last_user").prefetch_related("user_rows", "day_rows")
    serializer_class = AssignmentRuleSerializer
    lookup_field = "name"
    filterset_fields = ("document_type", "disabled")

    def create(self, request, *args, **kwargs):
        data = request.data
        rule = AssignmentRule.objects.create(
            name=data.get("name") or data.get("assignment_rule_name"),
            document_type=data.get("document_type", ""),
            due_date_based_on=data.get("due_date_based_on") or "",
            priority=data.get("priority") or 0,
            disabled=bool(data.get("disabled")),
            description=data.get("description") or "Automatic Assignment",
            rule=data.get("rule"),
            assign_condition=data.get("assign_condition") or "",
            unassign_condition=data.get("unassign_condition") or "",
            close_condition=data.get("close_condition") or "",
            assign_condition_json=data.get("assign_condition_json") or "",
            unassign_condition_json=data.get("unassign_condition_json") or "",
            field=data.get("field") or "",
        )
        _set_child_rows(rule, data)
        return Response(self.get_serializer(rule).data, status=201)

    def update(self, request, *args, **kwargs):
        rule = self.get_object()
        data = request.data
        for field in (
            "document_type", "due_date_based_on", "priority", "disabled", "description", "rule",
            "assign_condition", "unassign_condition", "close_condition",
            "assign_condition_json", "unassign_condition_json", "field",
        ):
            if field in data:
                setattr(rule, field, data[field])
        rule.save()
        _set_child_rows(rule, data)
        return Response(self.get_serializer(rule).data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_assignment_rules_list(request):
    rules = AssignmentRule.objects.filter(document_type__in=["CRM Lead", "CRM Deal"]).values(
        "name", "description", "disabled", "priority"
    )
    result = []
    for rule in rules:
        users_exists = AssignmentRuleUser.objects.filter(parent_rule_id=rule["name"]).exists()
        result.append({**rule, "users_exists": users_exists})
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def duplicate_assignment_rule(request):
    docname = request.data.get("docname")
    new_name = request.data.get("new_name")
    rule = AssignmentRule.objects.get(pk=docname)

    new_rule = AssignmentRule.objects.create(
        name=new_name, document_type=rule.document_type, due_date_based_on=rule.due_date_based_on,
        priority=rule.priority, disabled=rule.disabled, description=rule.description, rule=rule.rule,
        assign_condition=rule.assign_condition, unassign_condition=rule.unassign_condition,
        close_condition=rule.close_condition, assign_condition_json=rule.assign_condition_json,
        unassign_condition_json=rule.unassign_condition_json, field=rule.field,
    )
    for row in rule.user_rows.all():
        AssignmentRuleUser.objects.create(
            parent_rule=new_rule, table_field=row.table_field, idx=row.idx, user_id=row.user_id, weight=row.weight,
        )
    for row in rule.day_rows.all():
        AssignmentRuleDay.objects.create(parent_rule=new_rule, idx=row.idx, day=row.day)

    return Response(AssignmentRuleSerializer(new_rule).data)
