import { frappe } from '@/shared/frappe/runtime'
frappe.provide('frappe.ui')
frappe.ui.color = {
  get: function (this: any, color_name?: any, shade?: any) {
    if (color_name && shade) return this.get_color_shade(color_name, shade)
    if (color_name) return this.get_color_shade(color_name, 'default')
    return frappe.ui.color_map
  },
  get_color: function (color_name?: any) {
    const color_names = Object.keys(frappe.ui.color_map)
    if (color_names.includes(color_name)) {
      return frappe.ui.color_map[color_name]
    } else {
      console.warn(`'color_name' can be one of ${color_names} and not ${color_name}`)
    }
  },
  get_color_map() {
    const colors: any = ['red', 'green', 'blue', 'dark-green', 'yellow', 'gray', 'purple', 'pink', 'orange']
    const shades: any = ['100', '300', '500', '700']
    const style = getComputedStyle(document.body)
    let color_map: any = {}
    colors.forEach((color?: any) => {
      color_map[color] = shades.map((shade?: any) => style.getPropertyValue(`--${color}-${shade}`).trim())
    })
    return color_map
  },
  get_color_shade: function (this: any, color_name?: any, shade?: any) {
    const shades: any = {
      default: 2,
      light: 1,
      'extra-light': 0,
      dark: 3,
    }
    if (Object.keys(shades).includes(shade)) {
      const color = this.get_color(color_name)
      return color ? color[shades[shade]] : color_name
    } else {
      console.warn(`'shade' can be one of ${Object.keys(shades)} and not ${shade}`)
    }
  },
  all: function () {
    return Object.values(frappe.ui.color_map).reduce((acc?: any, curr?: any) => acc.concat(curr), [])
  },
  names: function () {
    return Object.keys(frappe.ui.color_map)
  },
  is_standard: function (this: any, color_name?: any) {
    if (!color_name) return false
    if (color_name.startsWith('#')) {
      return this.all().includes(color_name)
    }
    return this.names().includes(color_name)
  },
  get_color_name: function (hex?: any) {
    for (const key in frappe.ui.color_map) {
      const colors = frappe.ui.color_map[key]
      if (colors.includes(hex)) return key
    }
  },
  get_contrast_color: function (this: any, hex?: any) {
    if (!this.validate_hex(hex)) {
      return
    }
    if (!this.is_standard(hex)) {
      const brightness = this.brightness(hex)
      if (brightness < 128) {
        return this.lighten(hex, 0.5)
      }
      return this.lighten(hex, -0.5)
    }
    const color_name = this.get_color_name(hex)
    const colors = this.get_color(color_name)
    const shade_value = colors.indexOf(hex)
    if (shade_value <= 1) {
      return this.get(color_name, 'dark')
    }
    return this.get(color_name, 'extra-light')
  },
  validate_hex: function (hex?: any) {
    return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex)
  },
  lighten(color?: any, percent?: any) {
    let f = parseInt(String(color.slice(1)), 16),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = f >> 16,
      G = (f >> 8) & 0x00ff,
      B = f & 0x0000ff
    return (
      '#' +
      (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      )
        .toString(16)
        .slice(1)
    )
  },
  hex_to_rgb(hex?: any) {
    if (hex.startsWith('#')) {
      hex = hex.substring(1)
    }
    const r = parseInt(String(hex.substring(0, 2)), 16)
    const g = parseInt(String(hex.substring(2, 4)), 16)
    const b = parseInt(String(hex.substring(4, 6)), 16)
    return { r, g, b }
  },
  brightness(this: any, hex?: any) {
    const rgb = this.hex_to_rgb(hex)
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  },
}
frappe.ui.color_map = frappe.ui.color.get_color_map()
