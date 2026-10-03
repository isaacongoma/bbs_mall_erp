# Ported from crm/integrations/erpnext/utils.py + mirror_sync.py (frappe/crm, AGPL-3.0)
#
# In the original, this bridges two Frappe apps sharing one site/database:
# CRM's "CRM Product" doctype <-> ERPNext's "Item" doctype (plus their User
# Permission/DocShare records), active only when should_sync() finds ERPNext
# installed alongside CRM. ERPNext itself is not part of this Django port
# (see backend/README.md), so there is no "Item" doctype to sync with -- the
# full MirrorSync engine (create_mirror/sync_state_to_mirror/cascade_rename,
# ~230 lines across mirror_sync.py/doc_share.py/item.py/user_permission.py)
# would be entirely dead code without it. This ports the gate itself, correctly
# inactive, so the boundary is explicit rather than silently invented.
from __future__ import annotations

ERPNEXT_INSTALLED = False  # flip only once an ERPNext port exists in this project


def should_sync() -> bool:
    """ERPNext Item <-> CRM Product sync runs when ERPNext is installed
    alongside CRM in the same project and same-site integration is enabled.
    Always False here -- see module docstring."""
    return ERPNEXT_INSTALLED


def should_push_to_erpnext() -> bool:
    return False
