export type DurationFormatPreset = 'short' | 'long' | 'colon'

export type DurationFormat = DurationFormatPreset | (string & {})
