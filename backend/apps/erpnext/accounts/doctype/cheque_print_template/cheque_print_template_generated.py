from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ChequePrintTemplateGenerated(FrappeModel):
    doctype = 'Cheque Print Template'
    has_print_format = models.SmallIntegerField(default=0)
    bank_name = models.CharField(max_length=140, blank=True, null=True, default='')
    cheque_size = models.CharField(max_length=140, blank=True, null=True, default='Regular')
    starting_position_from_top_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cheque_width = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cheque_height = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    scanned_cheque = models.TextField(blank=True, null=True, default='')
    is_account_payable = models.SmallIntegerField(default=1)
    acc_pay_dist_from_top_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    acc_pay_dist_from_left_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    message_to_show = models.CharField(max_length=140, blank=True, null=True, default='Acc. Payee')
    date_dist_from_top_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    date_dist_from_left_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payer_name_from_top_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payer_name_from_left_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amt_in_words_from_top_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amt_in_words_from_left_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amt_in_word_width = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amt_in_words_line_spacing = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amt_in_figures_from_top_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amt_in_figures_from_left_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    acc_no_dist_from_top_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    acc_no_dist_from_left_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    signatory_from_top_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    signatory_from_left_edge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
