# Port of the parts of frappe/core/doctype/data_import/importer.py (frappe/frappe, MIT)
# that the CRM data-import screens use: CSV / Google Sheet reading, column -> field
# mapping, preview, row-by-row creation with a per-row log, and blank templates.
import csv
import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from django.conf import settings
from django.utils import timezone

from apps.core.identity import user_email
from apps.erpnext.registry import get_model
from apps.frappe.utils import generate_hash
from apps.core.meta import get_doctype_meta

PREVIEW_ROWS = 10
IGNORED_FIELDNAMES = {"creation", "modified", "owner", "modified_by", "docstatus", "idx", "id"}
IGNORED_FIELDTYPES = {"Section Break", "Column Break", "Tab Break", "HTML", "Table", "Table MultiSelect", "Button", "Image"}


class ImportSourceError(Exception):
    pass


def _file_path_from_url(file_url: str) -> Path | None:
    media_url = settings.MEDIA_URL or "/media/"
    path = urllib.parse.urlparse(file_url).path
    if not path.startswith(media_url):
        return None
    candidate = Path(settings.MEDIA_ROOT) / path[len(media_url):]
    return candidate if candidate.is_file() else None


def _sheet_csv_url(url: str) -> str:
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    if not match:
        raise ImportSourceError("Invalid Google Sheets link")
    gid = re.search(r"[#&?]gid=(\d+)", url)
    export = f"https://docs.google.com/spreadsheets/d/{match.group(1)}/export?format=csv"
    return export + (f"&gid={gid.group(1)}" if gid else "")


def read_rows(data_import) -> list[list[str]]:
    if data_import.import_file:
        path = _file_path_from_url(data_import.import_file)
        if path is None:
            raise ImportSourceError("Uploaded file could not be found")
        text = path.read_text(encoding="utf-8-sig")
    elif data_import.google_sheets_url:
        try:
            with urllib.request.urlopen(_sheet_csv_url(data_import.google_sheets_url), timeout=20) as response:
                text = response.read().decode("utf-8-sig")
        except OSError as error:
            raise ImportSourceError(f"Could not fetch the Google Sheet: {error}") from error
    else:
        raise ImportSourceError("No file or Google Sheet to import")
    return [row for row in csv.reader(io.StringIO(text)) if any(cell.strip() for cell in row)]


def importable_fields(doctype: str) -> list[dict]:
    meta = get_doctype_meta(doctype)
    if meta is None:
        raise ImportSourceError(f"Unknown document type {doctype}")
    fields = [{"fieldname": "name", "label": "ID", "fieldtype": "Data", "reqd": 0}]
    for field in meta["fields"]:
        if field["fieldname"] in IGNORED_FIELDNAMES or field["fieldtype"] in IGNORED_FIELDTYPES:
            continue
        if field.get("read_only") or field["fieldname"].startswith("_"):
            continue
        fields.append(field)
    return fields


def _normalise(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.lower())


def build_mapping(headers: list[str], fields: list[dict], column_to_field_map: dict) -> list[dict | None]:
    by_key: dict[str, dict] = {}
    for field in fields:
        by_key.setdefault(_normalise(field["label"] or ""), field)
        by_key.setdefault(_normalise(field["fieldname"]), field)
    by_name = {field["fieldname"]: field for field in fields}

    mapping: list[dict | None] = []
    for index, header in enumerate(headers):
        explicit = column_to_field_map.get(str(index))
        if explicit == "":
            mapping.append(None)
        elif explicit:
            mapping.append(by_name.get(explicit))
        else:
            mapping.append(by_key.get(_normalise(header)))
    return mapping


def _template_options(data_import) -> dict:
    if not data_import.template_options:
        return {}
    try:
        return json.loads(data_import.template_options) or {}
    except json.JSONDecodeError:
        return {}


def get_preview(data_import) -> dict:
    rows = read_rows(data_import)
    if not rows:
        raise ImportSourceError("The file is empty")
    headers, body = rows[0], rows[1:]
    fields = importable_fields(data_import.reference_doctype)
    options = _template_options(data_import)
    mapping = build_mapping(headers, fields, options.get("column_to_field_map") or {})

    columns = [{"header_title": "Sr. No", "column_number": 0, "map_to_field": None, "df": None}]
    warnings = []
    for index, header in enumerate(headers):
        field = mapping[index]
        columns.append(
            {
                "header_title": header,
                "column_number": index + 1,
                "map_to_field": field["fieldname"] if field else None,
                "df": {"label": field["label"], "fieldname": field["fieldname"]} if field else None,
            }
        )
        if field:
            warnings.append(
                {"type": "info", "message": f"Column <strong>{header}</strong> is mapped to <strong>{field['label']}</strong>"}
            )
        else:
            warnings.append(
                {"type": "warning", "message": f"Column <strong>{header}</strong> is not mapped to any field and will be skipped"}
            )

    mapped = {field["fieldname"] for field in mapping if field}
    for field in fields:
        if field.get("reqd") and field["fieldname"] not in mapped:
            warnings.append(
                {"type": "warning", "message": f"Mandatory field <strong>{field['label']}</strong> is not present in the file"}
            )

    data = [[number + 2, *row] for number, row in enumerate(body[:PREVIEW_ROWS])]
    return {"columns": columns, "data": data, "warnings": warnings, "total_rows": len(body)}


def _coerce(field: dict, value: str):
    value = value.strip()
    fieldtype = field["fieldtype"]
    if fieldtype == "Check":
        return value.lower() in {"1", "yes", "true", "y"}
    if fieldtype == "Int":
        return int(float(value))
    if fieldtype in {"Float", "Currency", "Percent"}:
        return float(value.replace(",", ""))
    return value


def _find_viewset(model):
    from apps.crm.urls import router

    for _prefix, viewset, _basename in router.registry:
        queryset = getattr(viewset, "queryset", None)
        if queryset is None:
            try:
                queryset = viewset().get_queryset()
            except Exception:
                queryset = None
        if queryset is not None and queryset.model is model:
            return viewset
    return None


def _create_record(doctype: str, payload: dict, user) -> dict:
    from rest_framework.test import APIRequestFactory, force_authenticate

    from apps.crm.doctype_registry import get_doctype_model

    model = get_doctype_model(doctype)
    viewset = _find_viewset(model)
    if viewset is None:
        raise ImportSourceError(f"Importing {doctype} is not supported")
    request = APIRequestFactory().post("/", payload, format="json")
    force_authenticate(request, user=user)
    response = viewset.as_view({"post": "create"})(request)
    if response.status_code >= 400:
        raise ImportSourceError(json.dumps(response.data) if response.data else f"HTTP {response.status_code}")
    data = response.data or {}
    return {"name": data.get("name") or data.get("id") or ""}


def _error_message(error: Exception) -> str:
    text = str(error)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return text
    if isinstance(parsed, dict):
        return "; ".join(
            f"{key}: {', '.join(map(str, value)) if isinstance(value, list) else value}" for key, value in parsed.items()
        )
    return text


def run_import(data_import, user) -> None:
    rows = read_rows(data_import)
    headers, body = rows[0], rows[1:]
    fields = importable_fields(data_import.reference_doctype)
    options = _template_options(data_import)
    mapping = build_mapping(headers, fields, options.get("column_to_field_map") or {})

    log_model = get_model("Data Import Log")
    log_model.objects.filter(data_import=data_import.name).delete()
    successes = failures = 0
    for number, row in enumerate(body):
        row_number = number + 2
        payload: dict = {}
        error: Exception | None = None
        try:
            for index, field in enumerate(mapping):
                if field is None or index >= len(row) or row[index].strip() == "":
                    continue
                payload[field["fieldname"]] = _coerce(field, row[index])
            created = _create_record(data_import.reference_doctype, payload, user)
        except Exception as caught:  # noqa: BLE001 -- every failure is logged against its row
            error = caught
            created = {"name": ""}

        if error is None:
            successes += 1
        else:
            failures += 1
        log_model.objects.create(
            name=generate_hash(length=10),
            data_import=data_import.name,
            log_index=number,
            success=1 if error is None else 0,
            docname=created["name"],
            messages=json.dumps([{"message": _error_message(error)}] if error else []),
            exception=repr(error) if error else "",
            row_indexes=json.dumps([row_number]),
            owner=user_email(user) or "Administrator",
            modified_by=user_email(user) or "Administrator",
            creation=timezone.now(),
            modified=timezone.now(),
        )

    if failures == 0:
        data_import.status = "Success"
    elif successes == 0:
        data_import.status = "Error"
    else:
        data_import.status = "Partial Success"
    data_import.modified = timezone.now()
    data_import.save(update_fields=["status", "modified"])


def get_logs(data_import) -> list[dict]:
    return [
        {
            "name": log.name,
            "success": bool(log.success),
            "docname": log.docname,
            "messages": log.messages or "[]",
            "exception": log.exception,
            "row_indexes": log.row_indexes or "[]",
        }
        for log in get_model("Data Import Log").objects.filter(data_import=data_import.name).order_by("log_index")
    ]


def build_template(doctype: str, export_fields: dict) -> str:
    fields = {field["fieldname"]: field for field in importable_fields(doctype)}
    selected = export_fields.get(doctype) or [name for name, field in fields.items() if field.get("reqd")]
    labels = [fields[name]["label"] for name in selected if name in fields]
    buffer = io.StringIO()
    csv.writer(buffer).writerow(labels)
    return buffer.getvalue()
