export interface FormScriptRecord {
  script: string
  [key: string]: unknown
}

export interface ScriptAction {
  label?: string
  [key: string]: any
}

export interface FormCustomizations {
  statuses: ScriptAction[]
  actions: ScriptAction[]
}

async function getFormScript(script: string, obj: unknown): Promise<Record<string, any>> {
  if (!script.includes('setupForm(')) return {}
  const scriptFn = new Function(`${script}\nreturn setupForm`)()
  const formScript = await scriptFn(obj)
  return formScript || {}
}

export async function setupCustomizations(
  scripts: FormScriptRecord[] | null | undefined,
  obj: unknown,
): Promise<FormCustomizations> {
  const result: FormCustomizations = { statuses: [], actions: [] }
  if (!scripts || !Array.isArray(scripts)) return result

  for (const record of scripts) {
    const formScript = await getFormScript(record.script, obj)
    result.actions = result.actions.concat(formScript?.actions || [])
    result.statuses = result.statuses.concat(formScript?.statuses || [])
  }
  return result
}

async function getListScript(script: string, obj: unknown): Promise<Record<string, any>> {
  const scriptFn = new Function(`${script}\nreturn setupList`)()
  const listScript = await scriptFn(obj)
  return listScript || {}
}

export interface ListCustomizations {
  actions: ScriptAction[]
  bulkActions: ScriptAction[]
}

export async function setupListCustomizations(
  data: {
    list_script?: string | FormScriptRecord[] | null
    listActions?: ScriptAction[]
    bulkActions?: ScriptAction[]
  },
  obj: unknown = {},
): Promise<ListCustomizations> {
  const empty: ListCustomizations = { actions: [], bulkActions: [] }
  if (!data.list_script) return empty

  let actions: ScriptAction[] = []
  let bulkActions: ScriptAction[] = []

  if (Array.isArray(data.list_script)) {
    for (const record of data.list_script) {
      const script = await getListScript(record.script, obj)
      actions = actions.concat(script?.actions || [])
      bulkActions = bulkActions.concat(script?.bulk_actions || [])
    }
  } else {
    const script = await getListScript(data.list_script, obj)
    actions = script?.actions || []
    bulkActions = script?.bulk_actions || []
  }

  data.listActions = actions
  data.bulkActions = bulkActions
  return { actions, bulkActions }
}
