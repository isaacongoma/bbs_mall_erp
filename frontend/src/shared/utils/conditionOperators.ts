export type OperatorOption = { label: string; value: string; [key: string]: unknown }

export const TYPE_CHECK = ['Check']
export const TYPE_LINK = ['Link', 'Dynamic Link']
export const TYPE_NUMBER = ['Float', 'Int', 'Currency', 'Percent']
export const TYPE_SELECT = ['Select']
export const TYPE_STRING = ['Data', 'Long Text', 'Small Text', 'Text Editor', 'Text']
export const TYPE_DATE = ['Date', 'Datetime']
export const TYPE_RATING = ['Rating']

const op = (label: string, value: string): OperatorOption => ({ label, value })

const EQUALS = op('Equals', '==')
const NOT_EQUALS = op('Not Equals', '!=')
const LIKE = op('Like', 'like')
const NOT_LIKE = op('Not Like', 'not like')
const IN = op('In', 'in')
const NOT_IN = op('Not In', 'not in')
const IS = op('Is', 'is')
const COMPARISONS = [op('<', '<'), op('>', '>'), op('<=', '<='), op('>=', '>=')]

export function getOperatorsFor(fieldtype: string, fieldname: string): OperatorOption[] {
  let options: OperatorOption[] = []
  if (TYPE_STRING.includes(fieldtype)) options.push(EQUALS, NOT_EQUALS, LIKE, NOT_LIKE, IN, NOT_IN, IS)
  if (fieldname === '_assign') options = [LIKE, NOT_LIKE, IS]
  if (TYPE_NUMBER.includes(fieldtype)) options.push(EQUALS, NOT_EQUALS, LIKE, NOT_LIKE, IN, NOT_IN, IS, ...COMPARISONS)
  if (TYPE_SELECT.includes(fieldtype)) options.push(EQUALS, NOT_EQUALS, IN, NOT_IN, IS)
  if (TYPE_LINK.includes(fieldtype)) options.push(EQUALS, NOT_EQUALS, LIKE, NOT_LIKE, IN, NOT_IN, IS)
  if (TYPE_CHECK.includes(fieldtype)) options.push(EQUALS)
  if (fieldtype === 'Duration') options.push(LIKE, NOT_LIKE, IN, NOT_IN, IS)
  if (TYPE_DATE.includes(fieldtype)) {
    options.push(
      EQUALS,
      NOT_EQUALS,
      IS,
      op('>', '>'),
      op('<', '<'),
      op('>=', '>='),
      op('<=', '<='),
      op('Between', 'between'),
    )
  }
  if (TYPE_RATING.includes(fieldtype)) {
    options.push(EQUALS, NOT_EQUALS, IS, op('>', '>'), op('<', '<'), op('>=', '>='), op('<=', '<='))
  }
  return options
}

export function resolveOperator(options: OperatorOption[], current: string): string {
  return options.find((option) => option.value === current)?.value ?? options[0]?.value ?? ''
}

export function parseSelectOptions(options: string | undefined): string[] {
  return (options ?? '').split('\n')
}
