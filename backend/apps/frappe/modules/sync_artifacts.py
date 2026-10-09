import importlib
import os

from django.db import transaction

import frappe
from frappe.modules.import_file import import_file_by_path

ARTIFACT_DIRS = (
    "report",
    "page",
    "print_format",
    "notification",
    "dashboard_chart_source",
    "dashboard_chart",
    "number_card",
    "dashboard",
    "onboarding_step",
    "module_onboarding",
    "form_tour",
    "workspace",
    "workspace_sidebar",
    "print_style",
    "sidebar",
    "web_form",
)


def app_root(app_name):
    return os.path.dirname(importlib.import_module(f"apps.{app_name}").__file__)


def artifact_files(app_name):
    files = []
    for module_name in frappe.local.app_modules.get(app_name) or []:
        folder = os.path.join(app_root(app_name), frappe.scrub(module_name))
        for directory in ARTIFACT_DIRS:
            base = os.path.join(folder, directory)
            if not os.path.isdir(base):
                continue
            for name in sorted(os.listdir(base)):
                path = os.path.join(base, name, f"{name}.json")
                if os.path.isfile(path):
                    files.append(path)
    dock_base = os.path.join(app_root(app_name), "dock")
    if os.path.isdir(dock_base):
        for name in sorted(os.listdir(dock_base)):
            path = os.path.join(dock_base, name, f"{name}.json")
            if os.path.isfile(path):
                files.append(path)
    return files


def sync_app_artifacts(app_name, force=False):
    imported = 0
    failed = []
    for path in artifact_files(app_name):
        try:
            with transaction.atomic():
                if import_file_by_path(path, force=force, ignore_version=True):
                    imported += 1
        except Exception as exc:
            failed.append((path, f"{type(exc).__name__}: {exc}"))
    return imported, failed


def sync_artifacts(force=False):
    summary = {}
    for app_name in ("frappe", "erpnext", "hrms"):
        summary[app_name] = sync_app_artifacts(app_name, force=force)
    return summary
