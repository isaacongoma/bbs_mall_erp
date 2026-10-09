import { __ } from '@/shared/frappe/runtime'
import AwesompleteLib from 'awesomplete'
const BaseAwesomplete: any = AwesompleteLib
export default class Awesomplete extends BaseAwesomplete {
  [key: string]: any
  constructor(input?: any, options?: any) {
    super(input, options)
    this.status.textContent = this.minChars
      ? __('Type {0} or more characters for results.', [this.minChars])
      : __('Begin typing for results.')
  }
  evaluate(this: any) {
    super.evaluate()
    this.status.textContent = this.opened ? __('{0} results found', [this.ul.children.length]) : __('No results found')
  }
  goto(this: any, index?: any) {
    super.goto(index)
    const items = this.ul.children
    if (index > -1 && items.length) {
      this.status.textContent = __('{0}, list item {1} of {2}', [items[index].textContent, index + 1, items.length])
    }
  }
}
if (typeof window !== 'undefined') {
  ;(window as any).Awesomplete = Awesomplete
}
