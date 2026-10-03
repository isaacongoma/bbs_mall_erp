import type { DocCellApi, DocListConfig } from './DocListView'
import { AvatarPrefix } from './AvatarPrefix'
import { assignPrefix, mobilePrefix, statusPrefix } from './listPrefixes'

export function richPrefix(api: DocCellApi, extra?: (api: DocCellApi) => React.ReactNode) {
  return assignPrefix(api) ?? statusPrefix(api) ?? extra?.(api) ?? mobilePrefix(api)
}

export function genericListConfig(doctype: string): DocListConfig {
  return {
    doctype,
    rich: true,
    getRowRoute: (row, route) => ({
      name: doctype,
      params: { id: row.name },
      query: { view: route.viewQuery, viewType: route.viewType },
    }),
    prefix: (api) =>
      richPrefix(api, (cell) => {
        if (cell.column.key === 'lead_name') {
          return <AvatarPrefix show={Boolean(cell.item.label)} image={cell.item.image} label={cell.item.image_label} />
        }
        if (cell.column.key === 'lead_owner') {
          return (
            <AvatarPrefix
              show={Boolean(cell.item.full_name)}
              image={cell.item.user_image}
              label={cell.item.full_name}
            />
          )
        }
        return undefined
      }),
  }
}
