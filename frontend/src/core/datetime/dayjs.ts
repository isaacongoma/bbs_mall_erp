import dayjsBase, { type Dayjs } from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import duration from 'dayjs/plugin/duration'
import isToday from 'dayjs/plugin/isToday'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import updateLocale from 'dayjs/plugin/updateLocale'
import utc from 'dayjs/plugin/utc'
import { getConfig } from '@/core/resources/config'

dayjsBase.extend(updateLocale)
dayjsBase.extend(relativeTime)
dayjsBase.extend(localizedFormat)
dayjsBase.extend(isToday)
dayjsBase.extend(duration)
dayjsBase.extend(utc)
dayjsBase.extend(timezone)
dayjsBase.extend(advancedFormat)
dayjsBase.extend(customParseFormat)

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function dayjsLocal(dateTimeString?: string): Dayjs {
  const systemTimezone = getConfig('systemTimezone')
  const localTimezone = getConfig('localTimezone') || browserTimezone()

  if (!systemTimezone) return dayjsBase(dateTimeString)
  if (!dateTimeString) return dayjsBase().tz(localTimezone)
  return dayjsBase.tz(dateTimeString, systemTimezone).tz(localTimezone)
}

export function dayjsSystem(dateTimeString?: string): Dayjs {
  const systemTimezone = getConfig('systemTimezone')
  const localTimezone = getConfig('localTimezone') || browserTimezone()

  if (!systemTimezone) return dayjsBase(dateTimeString)
  if (!dateTimeString) return dayjsBase().tz(systemTimezone)
  return dayjsBase.tz(dateTimeString, localTimezone).tz(systemTimezone)
}

export const dayjs = dayjsBase

export type { Dayjs }
