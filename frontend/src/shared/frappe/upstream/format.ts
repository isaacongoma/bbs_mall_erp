import { jQuery } from '@/shared/frappe/runtime'
function format(this: any, str?: any, args?: any) {
  if (str == undefined) return str
  this.unkeyed_index = 0
  return str.replace(
    /\{(\w*)\}/g,
    function (this: any, match?: any, key?: any) {
      if (key === '') {
        key = this.unkeyed_index
        this.unkeyed_index++
      }
      if (key == +key) {
        return args[key] !== undefined ? args[key] : match
      }
    }.bind(this),
  )
}
if (jQuery) {
  jQuery.format = format
}
