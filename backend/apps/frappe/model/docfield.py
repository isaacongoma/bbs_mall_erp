"""docfield utililtes"""

import frappe


def supports_translation(fieldtype):
    return fieldtype in ["Data", "Select", "Text", "Small Text", "Text Editor"]
