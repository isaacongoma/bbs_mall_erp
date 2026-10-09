import frappe

from erpnext.tests.utils import ERPNextTestSuite


class TestTransactionDeletionRecord(ERPNextTestSuite):
    def setUp(self):
        self._clear_all_deletion_cache_flags()

    def _clear_all_deletion_cache_flags(self):
        """Clear all deletion_running_doctype:* cache keys"""
        cache_keys = frappe.cache.get_keys("deletion_running_doctype:*")
        if cache_keys:
            for key in cache_keys:
                key_str = key.decode() if isinstance(key, bytes) else key
                if "|" in key_str:
                    key_name = key_str.split("|")[1]
                else:
                    key_name = key_str
                frappe.cache.delete_value(key_name)

    def test_doctypes_contain_company_field(self):
        """Test that all DocTypes in To Delete list have a valid company link field"""
        tdr = create_and_submit_transaction_deletion_doc("_Test Company 7")
        for doctype_row in tdr.doctypes_to_delete:
            if doctype_row.company_field:
                field_found = False
                doctype_fields = frappe.get_meta(doctype_row.doctype_name).as_dict()["fields"]
                for doctype_field in doctype_fields:
                    if (
                        doctype_field["fieldname"] == doctype_row.company_field
                        and doctype_field["fieldtype"] == "Link"
                        and doctype_field["options"] == "Company"
                    ):
                        field_found = True
                        break
                self.assertTrue(
                    field_found,
                    f"DocType {doctype_row.doctype_name} should have company field '{doctype_row.company_field}'",
                )

    def test_no_of_docs_is_correct(self):
        """Test that document counts are calculated correctly in To Delete list"""
        for _ in range(5):
            create_task("_Test Company 7")
        tdr = create_and_submit_transaction_deletion_doc("_Test Company 7")
        tdr.reload()

        task_found = False
        for doctype in tdr.doctypes_to_delete:
            if doctype.doctype_name == "Task":
                self.assertEqual(doctype.document_count, 5)
                task_found = True
                break
        self.assertTrue(task_found, "Task should be in To Delete list")

    def test_deletion_is_successful(self):
        """Test that deletion actually removes documents"""
        create_task("_Test Company 7")
        create_and_submit_transaction_deletion_doc("_Test Company 7")
        tasks_containing_company = frappe.get_all("Task", filters={"company": "_Test Company 7"})
        self.assertEqual(tasks_containing_company, [])

    def test_company_transaction_deletion_request(self):
        """Test creation via company deletion request method"""
        from erpnext.setup.doctype.company.company import create_transaction_deletion_request

        company = "_Test Company 7"

        create_transaction_deletion_request(company)

    def test_generate_to_delete_list(self):
        """Test automatic generation of To Delete list"""
        company = "_Test Company 7"
        create_task(company)

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.insert()

        tdr.generate_to_delete_list()
        tdr.reload()

        self.assertGreater(len(tdr.doctypes_to_delete), 0)
        task_in_list = any(d.doctype_name == "Task" for d in tdr.doctypes_to_delete)
        self.assertTrue(task_in_list, "Task should be in To Delete list")

    def test_validation_prevents_child_tables(self):
        """Test that child tables cannot be added to To Delete list"""
        company = "_Test Company 7"

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.append("doctypes_to_delete", {"doctype_name": "Sales Invoice Item"})

        with self.assertRaises(frappe.ValidationError):
            tdr.insert()

    def test_validation_prevents_protected_doctypes(self):
        """Test that protected DocTypes cannot be added to To Delete list"""
        company = "_Test Company 7"

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.append("doctypes_to_delete", {"doctype_name": "DocType"})

        with self.assertRaises(frappe.ValidationError):
            tdr.insert()

    def test_csv_export_import(self):
        """Test CSV export and import functionality with company_field column"""
        company = "_Test Company 7"
        create_task(company)

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.insert()
        tdr.generate_to_delete_list()
        tdr.reload()

        original_count = len(tdr.doctypes_to_delete)
        self.assertGreater(original_count, 0)

        tdr.export_to_delete_template_method()
        csv_content = frappe.response.get("result")
        self.assertIsNotNone(csv_content)
        self.assertIn("doctype_name", csv_content)
        self.assertIn("company_field", csv_content)

        tdr2 = frappe.new_doc("Transaction Deletion Record")
        tdr2.company = company
        tdr2.insert()
        result = tdr2.import_to_delete_template_method(csv_content)
        tdr2.reload()

        self.assertEqual(len(tdr2.doctypes_to_delete), original_count)
        self.assertGreaterEqual(result["imported"], 1)

        for row in tdr2.doctypes_to_delete:
            if row.doctype_name == "Task":
                self.assertIsNotNone(row.company_field, "Task should have company_field set after import")

    def test_csv_import_tolerates_short_rows(self):
        """Test that CSV rows omitting trailing columns are imported with an auto-detected company_field"""
        company = "_Test Company 7"

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.insert()

        csv_content = "doctype_name,company_field,child_doctypes\nSales Invoice\n"
        result = tdr.import_to_delete_template_method(csv_content)
        tdr.reload()

        self.assertEqual(result["imported"], 1)
        self.assertEqual(len(tdr.doctypes_to_delete), 1)

        row = tdr.doctypes_to_delete[0]
        self.assertEqual(row.doctype_name, "Sales Invoice")
        self.assertEqual(row.company_field, "company")

    def test_csv_import_all_skipped_rows_preserves_existing_to_delete_list(self):
        """Test that an all-skipped CSV import does not wipe an existing To Delete list"""
        company = "_Test Company 7"
        create_task(company)

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.insert()
        tdr.generate_to_delete_list()
        tdr.reload()

        original_doctype_names = [row.doctype_name for row in tdr.doctypes_to_delete]
        self.assertGreater(len(original_doctype_names), 0)

        protected_doctype = "DocType"
        nonexistent_doctype = "Nonexistent Doctype For Import Test"
        csv_content = (
            "doctype_name,company_field,child_doctypes\n"
            f"{protected_doctype},,\n"
            f"{nonexistent_doctype},,\n"
        )
        result = tdr.import_to_delete_template_method(csv_content)

        self.assertEqual(result["imported"], 0)
        self.assertGreater(result["skipped"], 0)

        tdr.reload()
        self.assertEqual(len(tdr.doctypes_to_delete), len(original_doctype_names))
        self.assertEqual([row.doctype_name for row in tdr.doctypes_to_delete], original_doctype_names)

    def test_progress_tracking(self):
        """Test that deleted checkbox is marked when DocType deletion completes"""
        company = "_Test Company 7"
        create_task(company)

        tdr = create_and_submit_transaction_deletion_doc(company)
        tdr.reload()

        task_row = None
        for doctype in tdr.doctypes_to_delete:
            if doctype.doctype_name == "Task":
                task_row = doctype
                break

        if task_row:
            self.assertEqual(task_row.deleted, 1, "Task should be marked as deleted")

    def test_composite_key_validation(self):
        """Test that duplicate (doctype_name + company_field) combinations are prevented"""
        company = "_Test Company 7"

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.append("doctypes_to_delete", {"doctype_name": "Task", "company_field": "company"})
        tdr.append("doctypes_to_delete", {"doctype_name": "Task", "company_field": "company"})

        with self.assertRaises(frappe.ValidationError):
            tdr.insert()

    def test_same_doctype_different_company_field_allowed(self):
        """Test that same DocType can be added with different company_field values"""
        company = "_Test Company 7"

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.append("doctypes_to_delete", {"doctype_name": "Task", "company_field": "company"})
        tdr.append("doctypes_to_delete", {"doctype_name": "Task", "company_field": None})

        try:
            tdr.insert()
            self.assertEqual(
                len(tdr.doctypes_to_delete),
                2,
                "Should allow 2 Task entries with different company_field values",
            )
        except frappe.ValidationError as e:
            self.fail(f"Should allow same DocType with different company_field values, but got error: {e}")

    def test_company_field_validation(self):
        """Test that invalid company_field values are rejected"""
        company = "_Test Company 7"

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.append("doctypes_to_delete", {"doctype_name": "Task", "company_field": "nonexistent_field"})

        with self.assertRaises(frappe.ValidationError):
            tdr.insert()

    def test_get_naming_series_prefix_with_dot(self):
        """Test prefix extraction for standard dot-separated naming series"""
        from erpnext.setup.doctype.transaction_deletion_record.transaction_deletion_record import (
            TransactionDeletionRecord,
        )

        self.assertEqual(TransactionDeletionRecord.get_naming_series_prefix("TDL.####", "Task"), "TDL")
        self.assertEqual(TransactionDeletionRecord.get_naming_series_prefix("PREFIX.#####", "Task"), "PREFIX")
        self.assertEqual(
            TransactionDeletionRecord.get_naming_series_prefix("TASK-.YYYY.-.#####", "Task"), "TASK-.YYYY.-"
        )

    def test_get_naming_series_prefix_with_brace(self):
        """Test prefix extraction for format patterns with brace separators"""
        from erpnext.setup.doctype.transaction_deletion_record.transaction_deletion_record import (
            TransactionDeletionRecord,
        )

        self.assertEqual(
            TransactionDeletionRecord.get_naming_series_prefix("QA-ACT-{#####}", "Quality Action"), "QA-ACT-"
        )
        self.assertEqual(
            TransactionDeletionRecord.get_naming_series_prefix("PREFIX-{####}", "Task"), "PREFIX-"
        )
        self.assertEqual(TransactionDeletionRecord.get_naming_series_prefix("{####}", "Task"), "")

    def test_get_naming_series_prefix_fallback(self):
        """Test prefix extraction fallback for patterns without standard separators"""
        from erpnext.setup.doctype.transaction_deletion_record.transaction_deletion_record import (
            TransactionDeletionRecord,
        )

        self.assertEqual(TransactionDeletionRecord.get_naming_series_prefix("PREFIX####", "Task"), "PREFIX")
        self.assertEqual(
            TransactionDeletionRecord.get_naming_series_prefix("JUSTPREFIX", "Task"), "JUSTPREFIX"
        )

    def test_cache_flag_management(self):
        """Test that cache flags can be set and cleared correctly"""
        company = "_Test Company 7"
        create_task(company)

        tdr = frappe.new_doc("Transaction Deletion Record")
        tdr.company = company
        tdr.insert()
        tdr.generate_to_delete_list()
        tdr.reload()

        tdr._set_deletion_cache()

        cached_value = frappe.cache.get_value("deletion_running_doctype:Task")
        self.assertEqual(cached_value, tdr.name, "Cache flag should be set for Task")

        tdr._clear_deletion_cache()

        cached_value = frappe.cache.get_value("deletion_running_doctype:Task")
        self.assertIsNone(cached_value, "Cache flag should be cleared for Task")

    def test_check_for_running_deletion_blocks_save(self):
        """Test that check_for_running_deletion_job blocks saves when cache flag exists"""
        from erpnext.setup.doctype.transaction_deletion_record.transaction_deletion_record import (
            check_for_running_deletion_job,
        )

        company = "_Test Company 7"

        frappe.cache.set_value("deletion_running_doctype:Task", "TDR-00001", expires_in_sec=60)

        try:
            new_task = frappe.new_doc("Task")
            new_task.company = company
            new_task.subject = "Should be blocked"

            with self.assertRaises(frappe.ValidationError) as context:
                check_for_running_deletion_job(new_task)

            error_message = str(context.exception)
            self.assertIn("currently deleting", error_message)
            self.assertIn("TDR-00001", error_message)
        finally:
            frappe.cache.delete_value("deletion_running_doctype:Task")

    def test_check_for_running_deletion_allows_save_when_no_flag(self):
        """Test that documents can be saved when no deletion is running"""
        company = "_Test Company 7"

        frappe.cache.delete_value("deletion_running_doctype:Task")

        new_task = frappe.new_doc("Task")
        new_task.company = company
        new_task.subject = "Should be allowed"

        try:
            new_task.insert()
            frappe.delete_doc("Task", new_task.name)
        except frappe.ValidationError as e:
            self.fail(f"Should allow save when no deletion is running, but got: {e}")

    def test_only_one_deletion_allowed_globally(self):
        """Test that only one deletion can be submitted at a time (global enforcement)"""
        company1 = "_Test Company 6"
        company2 = "_Test Company 7"

        tdr1 = frappe.new_doc("Transaction Deletion Record")
        tdr1.company = company1
        tdr1.insert()
        tdr1.append("doctypes_to_delete", {"doctype_name": "Task", "company_field": "company"})
        tdr1.save()
        tdr1.submit()

        try:
            tdr2 = frappe.new_doc("Transaction Deletion Record")
            tdr2.company = company2
            tdr2.insert()
            tdr2.append("doctypes_to_delete", {"doctype_name": "Lead", "company_field": "company"})
            tdr2.save()

            with self.assertRaises(frappe.ValidationError) as context:
                tdr2.submit()

            self.assertIn("already", str(context.exception).lower())
            self.assertIn(tdr1.name, str(context.exception))
        finally:
            tdr1.cancel()


def create_and_submit_transaction_deletion_doc(company):
    """Create and execute a transaction deletion record"""
    tdr = frappe.get_doc({"doctype": "Transaction Deletion Record", "company": company})
    tdr.insert()

    tdr.generate_to_delete_list()
    tdr.reload()

    tdr.process_in_single_transaction = True
    tdr.submit()
    return tdr


def create_task(company):
    task = frappe.get_doc({"doctype": "Task", "company": company, "subject": "Delete"})
    task.insert()
