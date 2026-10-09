interface String {
  plural: (count?: number) => string
}
interface Array<T> {
  uniqBy: (key: (item: T) => unknown) => T[]
}
