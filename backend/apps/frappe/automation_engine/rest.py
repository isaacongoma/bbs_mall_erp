from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import frappe
from apps.erpnext.api import call_whitelisted, jsonable, request_args, resolve_method
from apps.erpnext.views import _guard, with_frappe_session

LIST_FILTER_PARAMS = ("document_type", "enabled", "trigger_type")


class FrappeDocViewSet(viewsets.ViewSet):
    doctype = None
    lookup_field = "name"
    permission_classes = [IsAuthenticated]
    filter_params = ()
    default_order_by = "modified desc"

    def _run(self, request, fn):
        @with_frappe_session
        def wrapped(inner_request):
            return _guard(fn)

        return wrapped(request)

    def list(self, request):
        def run():
            filters = {key: request.query_params[key] for key in self.filter_params if key in request.query_params}
            rows = frappe.get_list(
                self.doctype,
                fields=["*"],
                filters=filters,
                order_by=self.default_order_by,
                limit_page_length=0,
            )
            return jsonable([frappe.get_doc(self.doctype, row.name).as_dict() for row in rows])

        return Response(self._run(request, run))

    def retrieve(self, request, name=None):
        return Response(self._run(request, lambda: jsonable(frappe.get_doc(self.doctype, name).as_dict())))

    def create(self, request):
        def run():
            data = dict(request.data)
            data["doctype"] = self.doctype
            return jsonable(frappe.get_doc(data).insert().as_dict())

        return Response(self._run(request, run), status=201)

    def update(self, request, name=None):
        def run():
            doc = frappe.get_doc(self.doctype, name)
            doc.update(dict(request.data))
            doc.save()
            return jsonable(doc.as_dict())

        return Response(self._run(request, run))

    def partial_update(self, request, name=None):
        return self.update(request, name=name)

    def destroy(self, request, name=None):
        def run():
            frappe.delete_doc(self.doctype, name)
            return {}

        self._run(request, run)
        return Response(status=204)


class AutomationFlowViewSet(FrappeDocViewSet):
    doctype = "Automation Flow"
    filter_params = LIST_FILTER_PARAMS


class BackgroundTaskViewSet(FrappeDocViewSet):
    doctype = "Background Task"
    filter_params = ("status", "task_type", "reference_doctype", "reference_name")


def automation_method_view(method_path, http_methods):
    @api_view(http_methods)
    @permission_classes([IsAuthenticated])
    @with_frappe_session
    def view(request):
        def run():
            frappe.form_dict.clear()
            frappe.form_dict.update(request_args(request))
            return jsonable(call_whitelisted(resolve_method(method_path), request.method, request_args(request)))

        return Response(_guard(run))

    view.__name__ = method_path.rsplit(".", 1)[-1]
    return view


get_automation_capabilities = automation_method_view("frappe.automation_engine.api.get_automation_capabilities", ["GET"])
validate_action_params = automation_method_view("frappe.automation_engine.api.validate_action_params", ["POST"])
get_param_options = automation_method_view("frappe.automation_engine.api.get_param_options", ["POST"])
run_manually = automation_method_view("frappe.automation_engine.api.run_manually", ["POST"])
trial_run = automation_method_view("frappe.automation_engine.api.trial_run", ["POST"])
get_runs = automation_method_view("frappe.automation_engine.api.get_runs", ["GET"])
