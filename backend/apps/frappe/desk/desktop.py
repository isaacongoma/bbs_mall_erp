from functools import wraps
from json import JSONDecodeError, dumps, loads

import frappe
from frappe import DoesNotExistError, ValidationError, _, _dict
from frappe.app_state import get_disabled_modules
from frappe.cache_manager import build_table_count_cache
from frappe.core.doctype.custom_role.custom_role import get_custom_allowed_roles
from frappe.desk.desk_views import DeskViews
from frappe.desk.doctype.custom_workspace.custom_workspace import (
    apply_customization,
    get_customization,
)
from frappe.desk.utils import is_item_allowed
from frappe.utils.caching import request_cache


def handle_not_exist(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except DoesNotExistError:
            frappe.clear_last_message()
            return []

    return wrapper


class Workspace(DeskViews):
    def __init__(self, page, minimal=False):
        self.page_name = page.get("name")
        self.page_title = page.get("title")
        self.public_page = page.get("public")
        self.workspace_manager = "Workspace Manager" in frappe.get_roles()

        self.user = frappe.get_user()

        customization = get_customization(self.page_name)
        if customization:
            self.doc = frappe.get_doc("Workspace", self.page_name)
            apply_customization(self.doc, customization)
        else:
            self.doc = frappe.get_cached_doc("Workspace", self.page_name)

        self.can_read = self.get_cached("user_perm_can_read", self.get_can_read_items)

        if not minimal:
            if self.doc.content:
                self.onboarding_list = [
                    x["data"]["onboarding_name"] for x in loads(self.doc.content) if x["type"] == "onboarding"
                ]

            self.table_counts = get_table_with_counts()

    def is_permitted(self):
        """Return true if the workspace is visible to the current user.

        Visibility is gated purely by access (module visibility / roles):

        1. Its `module` must be visible to the user, meaning not one they have blocked.
        2. Then, if the workspace has `roles`, the user must have one of them.

        The module check runs before the roles branch. It used to sit inside the no-roles branch,
        so a role-gated workspace in a blocked module stayed visible and the block did nothing for
        exactly the workspaces someone had restricted.

        No dock layer is an access filter, whether the app's fragment, the site's arrangement or a
        user's own. All three are arrangements, applied on the client from `frappe.boot.dock`.
        Keeping them out of here keeps the full permitted pool available for the picker.
        """
        from frappe.utils import has_common
        from frappe.utils.modules import is_module_visible

        if self.doc.for_user and self.doc.for_user == frappe.session.user:
            return True

        if not is_module_visible(self.doc.module):
            return False

        allowed = [d.role for d in self.doc.roles]
        allowed.extend(get_custom_allowed_roles("page", self.doc.name))

        if not allowed:
            return True

        if has_common(frappe.get_roles(), allowed):
            return True

    def get_cached(self, cache_key, fallback_fn):
        value = frappe.cache.get_value(cache_key, user=frappe.session.user)
        if value is not None:
            return value

        value = fallback_fn()

        frappe.cache.set_value(cache_key, value, frappe.session.user, 21600)
        return value

    def get_can_read_items(self):
        if not self.user.can_read:
            self.user.build_permissions()

        return self.user.can_read

    def get_allowed_modules(self):
        if not self.user.allow_modules:
            self.user.build_permissions()

        return self.user.allow_modules

    def get_onboarding_doc(self, onboarding):
        if not frappe.get_system_settings("enable_onboarding"):
            return None

        if not self.onboarding_list:
            return None

        if frappe.db.get_value("Module Onboarding", onboarding, "is_complete"):
            return None

        doc = frappe.get_doc("Module Onboarding", onboarding)

        allowed_roles = set(doc.get_allowed_roles())
        user_roles = set(frappe.get_roles())
        if not allowed_roles & user_roles:
            return None

        if doc.check_completion():
            return None

        return doc

    def build_workspace(self):
        self.cards = {"items": self.get_links()}
        self.charts = {"items": self.get_charts()}
        self.shortcuts = {"items": self.get_shortcuts()}
        self.onboardings = {"items": []}
        self.quick_lists = {"items": self.get_quick_lists()}
        self.number_cards = {"items": self.get_number_cards()}
        self.custom_blocks = {"items": self.get_custom_blocks()}

    def _doctype_contains_a_record(self, name):
        exists = self.table_counts.get(name, False)

        if not exists and frappe.db.exists(name):
            if not frappe.db.get_value("DocType", name, "issingle"):
                exists = bool(frappe.get_all(name, limit=1))
            else:
                exists = True
            self.table_counts[name] = exists

        return exists

    def _prepare_item(self, item):
        if item.dependencies:
            dependencies = [dep.strip() for dep in item.dependencies.split(",")]

            incomplete_dependencies = [d for d in dependencies if not self._doctype_contains_a_record(d)]

            if len(incomplete_dependencies):
                item.incomplete_dependencies = incomplete_dependencies
            else:
                item.incomplete_dependencies = ""

        if item.onboard:
            if item.get("type") == "doctype":
                name = item.get("name")
                count = self._doctype_contains_a_record(name)

                item["count"] = count

        if item.get("link_type") == "DocType":
            try:
                item["description"] = frappe.get_meta(item.link_to).description
            except DoesNotExistError:
                frappe.clear_last_message()
                return None

        item["label"] = _(item.label) if item.label else _(item.name)

        return item

    def is_custom_block_permitted(self, custom_block_name):
        from frappe.utils import has_common

        allowed = [
            d.role for d in frappe.get_all("Has Role", fields=["role"], filters={"parent": custom_block_name})
        ]

        if not allowed:
            return True

        roles = frappe.get_roles()

        if has_common(roles, allowed):
            return True

        return False

    @handle_not_exist
    def get_links(self):
        cards = self.doc.get_link_groups()

        if not self.doc.hide_custom:
            cards = cards + get_custom_reports_and_doctypes(self.doc.module)

        default_country = frappe.db.get_default("country")

        new_data = []
        for card in cards:
            new_items = []
            card = _dict(card)

            links = card.get("links", [])

            for item in links:
                item = _dict(item)

                if item.country and item.country != default_country:
                    continue

                if is_item_allowed(item.link_to, item.link_type, self):
                    prepared_item = self._prepare_item(item)
                    if prepared_item is not None:
                        new_items.append(prepared_item)

            if new_items:
                if isinstance(card, _dict):
                    new_card = card.copy()
                else:
                    new_card = card.as_dict().copy()
                new_card["links"] = new_items
                new_card["label"] = _(new_card["label"])
                new_data.append(new_card)

        return new_data

    @handle_not_exist
    def get_charts(self):
        all_charts = []
        if frappe.has_permission("Dashboard Chart", throw=False):
            charts = self.doc.charts

            for chart in charts:
                if frappe.has_permission("Dashboard Chart", doc=chart.chart_name):
                    chart.label = _(chart.label) if chart.label else _(chart.chart_name)
                    all_charts.append(chart)

        return all_charts

    @handle_not_exist
    def get_shortcuts(self):
        def _in_active_domains(item):
            if not item.restrict_to_domain:
                return True
            else:
                return item.restrict_to_domain in frappe.get_active_domains()

        items = []
        shortcuts = self.doc.shortcuts

        for item in shortcuts:
            new_item = item.as_dict().copy()
            if is_item_allowed(item.link_to, item.type, self) and _in_active_domains(item):
                if item.type == "Report":
                    report = self.allowed_reports.get(item.link_to, {})
                    if report.get("report_type") in ["Query Report", "Script Report", "Custom Report"]:
                        new_item["is_query_report"] = 1
                    else:
                        new_item["ref_doctype"] = report.get("ref_doctype")

                new_item["label"] = _(item.label) if item.label else _(item.link_to)

                items.append(new_item)

        return items

    @handle_not_exist
    def get_quick_lists(self):
        items = []
        quick_lists = self.doc.quick_lists

        for item in quick_lists:
            if is_item_allowed(item.document_type, "doctype", self):
                new_item = item.as_dict().copy()

                new_item["label"] = _(item.label) if item.label else _(item.document_type)

                items.append(new_item)

        return items

    @handle_not_exist
    def get_number_cards(self):
        all_number_cards = []
        if frappe.has_permission("Number Card", throw=False):
            number_cards = self.doc.number_cards
            for number_card in number_cards:
                if frappe.has_permission("Number Card", doc=number_card.number_card_name):
                    number_card.label = (
                        _(number_card.label) if number_card.label else _(number_card.number_card_name)
                    )
                    all_number_cards.append(number_card)

        return all_number_cards

    @handle_not_exist
    def get_custom_blocks(self):
        all_custom_blocks = []
        if frappe.has_permission("Custom HTML Block", throw=False):
            custom_blocks = self.doc.custom_blocks

            for custom_block in custom_blocks:
                if frappe.has_permission("Custom HTML Block", doc=custom_block.custom_block_name):
                    if not self.is_custom_block_permitted(custom_block.custom_block_name):
                        continue

                    custom_block.label = (
                        _(custom_block.label) if custom_block.label else _(custom_block.custom_block_name)
                    )
                    all_custom_blocks.append(custom_block)

        return all_custom_blocks


@frappe.whitelist()
@frappe.read_only()
def get_desktop_page(page: str | dict):
    """Apply permissions, customizations and return the configuration for a page on desk.

    Args:
            page (json): page data

    Return:
            dict: dictionary of cards, charts and shortcuts to be displayed on website
    """
    try:
        workspace = Workspace(frappe.parse_json(page))
        workspace.build_workspace()
        return {
            "charts": workspace.charts,
            "shortcuts": workspace.shortcuts,
            "cards": workspace.cards,
            "onboardings": workspace.onboardings,
            "quick_lists": workspace.quick_lists,
            "number_cards": workspace.number_cards,
            "custom_blocks": workspace.custom_blocks,
        }
    except DoesNotExistError:
        frappe.log_error("Workspace Missing")
        return {}


def _overlay_customization_properties(pages: list) -> bool:
    """Apply each site customization's property facet onto the listed page dict.

    Returns whether any `sequence_id` was overridden (so the caller knows to re-sort).
    """
    resequenced = False
    for page in pages:
        customization = get_customization(page.name)
        if not customization:
            continue
        page["is_customized"] = True
        if customization.content:
            page["content"] = customization.content
            page["is_layout_customized"] = 1
        if customization.visibility == "Hidden":
            page["is_hidden"] = 1
        elif customization.visibility == "Visible":
            page["is_hidden"] = 0
        if customization.icon:
            page["icon"] = customization.icon
        if customization.indicator_color:
            page["indicator_color"] = customization.indicator_color
        if customization.override_sequence:
            page["sequence_id"] = customization.sequence_id
            resequenced = True
    return resequenced


@request_cache
def get_workspaces():
    """Get list of sidebar items for desk.

    Cached per-request: a single boot resolves the visible workspaces several times
    (`DeskViews.build_entities`, `get_workspaces_with_sidebar`, and the lazy
    `DeskViews.allowed_workspaces` permission context), and each pass runs a
    `get_all("Workspace")` query plus a `Workspace()` build per page. Memoising for the
    life of the request collapses those into one enumeration without leaking across
    requests (the cache clears when the request ends).
    """

    from frappe.utils.modules import get_module_placement

    has_access = "Workspace Manager" in frappe.get_roles()

    allowed_domains = [None, *frappe.get_active_domains()]

    disabled_modules = list(get_disabled_modules())

    filters = {
        "restrict_to_domain": ["in", allowed_domains],
    }

    if has_access:
        filters = {}

    if disabled_modules:
        filters["module"] = ["not in", disabled_modules]

    order_by = "sequence_id asc"
    fields = [
        "name",
        "title",
        "for_user",
        "parent_page",
        "content",
        "public",
        "module",
        "icon",
        "indicator_color",
        "is_hidden",
        "sequence_id",
        "standard",
        "type",
        "link_type",
        "link_to",
        "external_link",
    ]
    all_pages = frappe.get_all(
        "Workspace", fields=fields, filters=filters, order_by=order_by, ignore_permissions=True
    )

    if _overlay_customization_properties(all_pages):
        all_pages.sort(key=lambda page: page.get("sequence_id") or 0)

    pages = []
    private_pages = []

    for page in all_pages:
        try:
            workspace = Workspace(page, True)
            if has_access or workspace.is_permitted():
                if page.public and (has_access or not page.is_hidden):
                    pages.append(page)
                elif page.for_user == frappe.session.user:
                    private_pages.append(page)
                elif not page.public and not page.for_user:
                    pages.append(page)
                page["label"] = _(page.get("name"))

            page["app"] = get_module_placement(page["module"]) if page["module"] else None
            if page["link_type"] == "Report":
                report_type, ref_doctype = frappe.db.get_value(
                    "Report", page["link_to"], ["report_type", "ref_doctype"]
                )
                page["report"] = {
                    "report_type": report_type,
                    "ref_doctype": ref_doctype,
                }

        except frappe.PermissionError:
            pass
    if private_pages:
        pages.extend(private_pages)

    return {
        "pages": pages,
        "has_access": has_access,
        "has_create_access": frappe.has_permission(doctype="Workspace", ptype="create"),
    }


def get_table_with_counts():
    counts = frappe.cache.get_value("information_schema:counts")
    if not counts:
        counts = build_table_count_cache()

    return counts


def get_custom_reports_and_doctypes(module):
    return [
        _dict({"label": _("Custom Documents"), "links": get_custom_doctype_list(module)}),
        _dict({"label": _("Custom Reports"), "links": get_custom_report_list(module)}),
    ]


def get_custom_doctype_list(module):
    doctypes = frappe.get_all(
        "DocType",
        fields=["name"],
        filters={"custom": 1, "istable": 0, "module": module},
        order_by="name",
    )

    return [
        {
            "type": "Link",
            "link_type": "doctype",
            "link_to": d.name,
            "label": _(d.name),
        }
        for d in doctypes
    ]


def get_custom_report_list(module):
    """Return list on new style reports for modules."""
    reports = frappe.get_all(
        "Report",
        fields=["name", "ref_doctype", "report_type"],
        filters={"is_standard": "No", "disabled": 0, "module": module},
        order_by="name",
    )

    return [
        {
            "type": "Link",
            "link_type": "report",
            "doctype": r.ref_doctype,
            "dependencies": r.ref_doctype,
            "is_query_report": 1
            if r.report_type in ("Query Report", "Script Report", "Custom Report")
            else 0,
            "label": _(r.name),
            "link_to": r.name,
            "report_ref_doctype": r.ref_doctype,
        }
        for r in reports
    ]




def clean_up(original_page, blocks):
    page_widgets = {}

    for wid in ["shortcut", "card", "chart", "quick_list", "number_card", "custom_block"]:
        page_widgets[wid] = [x["data"][wid + "_name"] for x in loads(blocks) if x["type"] == wid]

    for wid in ["shortcut", "chart", "quick_list", "number_card", "custom_block"]:
        updated_widgets = []
        original_page.get(wid + "s").reverse()

        for w in original_page.get(wid + "s"):
            if w.label in page_widgets[wid] and w.label not in [x.label for x in updated_widgets]:
                updated_widgets.append(w)
        original_page.set(wid + "s", updated_widgets)

    for i, v in enumerate(original_page.links):
        if v.type == "Card Break" and v.label not in page_widgets["card"]:
            del original_page.links[i : i + v.link_count + 1]


def new_widget(config, doctype, parentfield):
    if not config:
        return []
    prepare_widget_list = []
    for idx, widget in enumerate(config):
        widget.pop("name", None)

        doc = frappe.new_doc(doctype)
        doc.update(widget)

        doc.idx = idx + 1

        doc.parentfield = parentfield

        prepare_widget_list.append(doc)
    return prepare_widget_list


def prepare_widget(config, doctype, parentfield):
    """Create widget child table entries with parent details.

    Args:
            config (dict): Dictionary containing widget config
            doctype (string): Doctype name of the child table
            parentfield (string): Parent field for the child table

    Return:
            TYPE: List of Document objects
    """
    if not config:
        return []
    order = config.get("order")
    widgets = config.get("widgets")
    prepare_widget_list = []
    for idx, name in enumerate(order):
        wid_config = widgets[name].copy()
        wid_config.pop("name", None)

        doc = frappe.new_doc(doctype)
        doc.update(wid_config)

        doc.idx = idx + 1

        doc.parentfield = parentfield

        prepare_widget_list.append(doc)
    return prepare_widget_list


@frappe.whitelist()
def update_onboarding_step(name: str | int, field: str, value: int | str):
    """Update status of onboaridng step

    Args:
            name (string): Name of the doc
            field (string): field to be updated
            value: Value to be updated

    """
    from frappe.utils.telemetry import capture

    allowed_fields = ["is_skipped", "is_complete"]
    if field not in allowed_fields:
        return
    frappe.db.set_value("Onboarding Step", name, field, value)

    capture(frappe.scrub(name), app="frappe_onboarding", properties={field: value})


@frappe.whitelist()
def get_installed_apps():
    return frappe.get_active_apps()


@frappe.whitelist()
@frappe.read_only()
def get_onboarding_data(module: str):
    """Get onboarding data for a page

    Args:
            page (string): page name

    Return:
            dict: onboarding data
    """
    if not frappe.get_system_settings("enable_onboarding"):
        return []

    onboardings = []
    onboarding_doc = frappe.get_doc("Module Onboarding", module)
    if onboarding_doc.is_complete:
        return []

    allowed_roles = set(onboarding_doc.get_allowed_roles())
    user_roles = set(frappe.get_roles())
    if not allowed_roles & user_roles:
        return None

    item = {
        "label": _(module),
        "title": _(onboarding_doc.title),
        "items": [],
    }

    maps = frappe.get_all(
        "Onboarding Step Map",
        filters={"parent": onboarding_doc.name},
        fields=["step", "is_optional"],
        order_by="idx",
    )
    for step_map in maps:
        steps = frappe.get_all("Onboarding Step", filters={"name": step_map.step}, order_by="idx", fields=["*"])

        if steps:
            item["items"].append({**steps[0], "is_optional": step_map.is_optional})

    onboardings.append(item)

    if all(step.get("is_complete") or step.get("is_skipped") for step in item["items"] if not step.get("is_optional")):
        return []

    return onboardings


def get_onboarding_step_maps(onboarding):
    return frappe.get_all("Onboarding Step Map", filters={"parent": onboarding}, pluck="step", order_by="idx")


def save_new_widget(doc, page, blocks, new_widgets):
    widgets = _dict()
    if new_widgets:
        widgets = _dict(frappe.parse_json(new_widgets))

        if widgets.chart:
            doc.charts.extend(new_widget(widgets.chart, "Workspace Chart", "charts"))
        if widgets.shortcut:
            doc.shortcuts.extend(new_widget(widgets.shortcut, "Workspace Shortcut", "shortcuts"))
        if widgets.quick_list:
            doc.quick_lists.extend(new_widget(widgets.quick_list, "Workspace Quick List", "quick_lists"))
        if widgets.custom_block:
            doc.custom_blocks.extend(
                new_widget(widgets.custom_block, "Workspace Custom Block", "custom_blocks")
            )
        if widgets.number_card:
            doc.number_cards.extend(new_widget(widgets.number_card, "Workspace Number Card", "number_cards"))
        if widgets.card:
            doc.build_links_table_from_card(widgets.card)

    clean_up(doc, blocks)

    try:
        doc.save(ignore_permissions=True)
    except (ValidationError, TypeError) as e:
        json_config = widgets and dumps(widgets, sort_keys=True, indent=4)

        log = f"""
        page: {page}
        config: {json_config}
        exception: {e}
        """
        doc.log_error("Could not save customization", log)
        raise

    return True
