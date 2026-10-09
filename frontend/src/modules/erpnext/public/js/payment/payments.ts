import { $, __, cint, cstr, erpnext, flt, format_currency, frappe, precision, repl } from '@/shared/frappe'
erpnext.payments = class payments extends erpnext.stock.StockController {
  [key: string]: any
  make_payment(this: any) {
    this.dialog = new frappe.ui.Dialog({
      title: 'Payment',
    })
    this.dialog.show()
    this.$body = this.dialog.body
    this.set_payment_primary_action()
    this.make_keyboard()
    this.select_text()
  }
  select_text(this: any) {
    $(this.$body)
      .find('.form-control')
      .click(function (this: any) {
        $(this).select()
      })
  }
  set_payment_primary_action(this: any) {
    let me = this
    this.dialog.set_primary_action(__('Submit'), function () {
      $.each(me.frm.doc.payments, function (_index?: any, data?: any) {
        if (data.amount != 0) {
          me.dialog.hide()
          me.submit_invoice()
          return
        }
      })
    })
  }
  make_keyboard(this: any) {
    $(this.$body).empty()
    $(this.$body).html(frappe.render_template('pos_payment', this.frm.doc))
    this.show_payment_details()
    this.bind_keyboard_event()
    this.clear_amount()
  }
  make_multimode_payment(this: any) {
    let me = this
    if (this.frm.doc.change_amount > 0) {
      me.payment_val = me.doc.outstanding_amount
    }
    this.payments = frappe.model.add_child(this.frm.doc, 'Multi Mode Payment', 'payments')
    this.payments.mode_of_payment = this.dialog.fields_dict.mode_of_payment.get_value()
    this.payments.amount = flt(this.payment_val)
  }
  show_payment_details(this: any) {
    let me = this
    let multimode_payments = $(this.$body).find('.multimode-payments').empty()
    if (this.frm.doc.payments.length) {
      $.each(this.frm.doc.payments, function (_index?: any, data?: any) {
        $(
          frappe.render_template('payment_details', {
            mode_of_payment: data.mode_of_payment,
            amount: data.amount,
            idx: data.idx,
            currency: me.frm.doc.currency,
            type: data.type,
          }),
        ).appendTo(multimode_payments)
        if (data.type == 'Cash' && data.amount == me.frm.doc.paid_amount) {
          me.idx = data.idx
          me.selected_mode = $(me.$body).find(repl("input[idx='%(idx)s']", { idx: me.idx }))
          me.highlight_selected_row()
          me.bind_amount_change_event()
        }
      })
    } else {
      $('<p>No payment mode selected in pos profile</p>').appendTo(multimode_payments)
    }
  }
  set_outstanding_amount(this: any) {
    this.selected_mode = $(this.$body).find(repl("input[idx='%(idx)s']", { idx: this.idx }))
    this.highlight_selected_row()
    this.payment_val = 0.0
    if (this.frm.doc.outstanding_amount > 0 && flt(this.selected_mode.val()) == 0.0) {
      this.payment_val = flt(
        this.frm.doc.outstanding_amount / this.frm.doc.conversion_rate,
        precision('outstanding_amount'),
      )
      this.selected_mode.val(format_currency(this.payment_val, this.frm.doc.currency))
      this.update_payment_amount()
    } else if (flt(this.selected_mode.val()) > 0) {
      this.payment_val = flt(this.selected_mode.val())
    }
    this.selected_mode.select()
    this.bind_amount_change_event()
  }
  bind_keyboard_event(this: any) {
    this.payment_val = ''
    this.bind_form_control_event()
    this.bind_numeric_keys_event()
  }
  bind_form_control_event(this: any) {
    let me = this
    $(this.$body)
      .find('.pos-payment-row')
      .click(function (this: any) {
        me.idx = $(this).attr('idx')
        me.set_outstanding_amount()
      })
    $(this.$body)
      .find('.form-control')
      .click(function (this: any) {
        me.idx = $(this).attr('idx')
        me.set_outstanding_amount()
        me.update_paid_amount(true)
      })
    $(this.$body)
      .find('.write_off_amount')
      .change(function (this: any) {
        me.write_off_amount(flt($(this).val()), precision('write_off_amount'))
      })
    $(this.$body)
      .find('.change_amount')
      .change(function (this: any) {
        me.change_amount(flt($(this).val()), precision('change_amount'))
      })
  }
  highlight_selected_row(this: any) {
    let selected_row = $(this.$body).find(repl(".pos-payment-row[idx='%(idx)s']", { idx: this.idx }))
    $(this.$body).find('.pos-payment-row').removeClass('selected-payment-mode')
    selected_row.addClass('selected-payment-mode')
    $(this.$body).find('.amount').attr('disabled', true)
    this.selected_mode.attr('disabled', false)
  }
  bind_numeric_keys_event(this: any) {
    let me = this
    $(this.$body)
      .find('.pos-keyboard-key')
      .click(function (this: any) {
        me.payment_val += $(this).text()
        me.selected_mode.val(format_currency(me.payment_val, me.frm.doc.currency))
        me.idx = me.selected_mode.attr('idx')
        me.update_paid_amount()
      })
    $(this.$body)
      .find('.delete-btn')
      .click(function () {
        me.payment_val = cstr(flt(me.selected_mode.val())).slice(0, -1)
        me.selected_mode.val(format_currency(me.payment_val, me.frm.doc.currency))
        me.idx = me.selected_mode.attr('idx')
        me.update_paid_amount()
      })
  }
  bind_amount_change_event(this: any) {
    let me = this
    this.selected_mode.change(function (this: any) {
      me.payment_val = flt($(this).val()) || 0.0
      me.selected_mode.val(format_currency(me.payment_val, me.frm.doc.currency))
      me.idx = me.selected_mode.attr('idx')
      me.update_payment_amount()
    })
  }
  clear_amount(this: any) {
    let me = this
    $(this.$body)
      .find('.clr')
      .click(function (this: any, e?: any) {
        e.stopPropagation()
        me.idx = $(this).attr('idx')
        me.selected_mode = $(me.$body).find(repl("input[idx='%(idx)s']", { idx: me.idx }))
        me.payment_val = 0.0
        me.selected_mode.val(0.0)
        me.highlight_selected_row()
        me.update_payment_amount()
      })
  }
  write_off_amount(this: any, write_off_amount?: any) {
    this.frm.doc.write_off_amount = flt(write_off_amount, precision('write_off_amount'))
    this.frm.doc.base_write_off_amount = flt(
      this.frm.doc.write_off_amount * this.frm.doc.conversion_rate,
      precision('base_write_off_amount'),
    )
    this.calculate_outstanding_amount(false)
    this.show_amounts()
  }
  change_amount(this: any, change_amount?: any) {
    this.frm.doc.change_amount = flt(change_amount, precision('change_amount'))
    this.calculate_write_off_amount()
    this.show_amounts()
  }
  update_paid_amount(this: any, update_write_off?: any) {
    let value: any
    let me = this
    if (['change_amount', 'write_off_amount'].includes(this.idx)) {
      value = me.selected_mode.val()
      if (me.idx == 'change_amount') {
        me.change_amount(value)
      } else {
        if (flt(value) == 0 && update_write_off && me.frm.doc.outstanding_amount > 0) {
          value = flt(me.frm.doc.outstanding_amount / me.frm.doc.conversion_rate, precision(me.idx))
        }
        me.write_off_amount(value)
      }
    } else {
      this.update_payment_amount()
    }
  }
  update_payment_amount(this: any) {
    let me = this
    $.each(this.frm.doc.payments, function (_index?: any, data?: any) {
      if (cint(me.idx) == cint(data.idx)) {
        data.amount = flt(me.selected_mode.val(), 2)
      }
    })
    this.calculate_outstanding_amount(false)
    this.show_amounts()
  }
  show_amounts(this: any) {
    $(this.$body).find('.write_off_amount').val(format_currency(this.frm.doc.write_off_amount, this.frm.doc.currency))
    $(this.$body).find('.paid_amount').text(format_currency(this.frm.doc.paid_amount, this.frm.doc.currency))
    $(this.$body).find('.change_amount').val(format_currency(this.frm.doc.change_amount, this.frm.doc.currency))
    $(this.$body)
      .find('.outstanding_amount')
      .text(
        format_currency(
          this.frm.doc.outstanding_amount,
          frappe.get_doc(':Company', this.frm.doc.company).default_currency,
        ),
      )
    this.update_invoice()
  }
}
