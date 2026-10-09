from django.test import SimpleTestCase

from apps.core.doctype.assignment_rule.assignment_rule_engine import safe_eval as rule_eval


class ConditionEvaluatorTests(SimpleTestCase):
    databases = {"default"}

    def test_assignment_rule_expressions_use_bare_field_names(self):
        document = {"status": "New", "score": 7}
        self.assertTrue(rule_eval("status == 'New' and score >= 7", document))
        self.assertFalse(rule_eval("missing == 1", document))
        self.assertFalse(rule_eval("", document))
        self.assertFalse(rule_eval("__import__('os')", document))
