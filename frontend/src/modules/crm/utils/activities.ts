import type { ComponentType } from 'react'
import { __ } from '@/core/i18n'
import {
  ActivityIcon,
  AttachmentIcon,
  CommentIcon,
  DetailsIcon,
  DotIcon,
  EmailIcon,
  PhoneIcon,
} from '@/shared/components/Icons'
import { DealsIcon, InboundCallIcon, LeadsIcon, OutboundCallIcon } from '../components/Icons'
import { NoteIcon, TaskIcon, WhatsAppIcon } from '../components/Icons'

type AnyRecord = Record<string, any>
type IconComponent = ComponentType<{ className?: string }>

export function sortByCreation<T extends AnyRecord>(list: T[], newestFirst = false): T[] {
  return [...list].sort((a, b) =>
    newestFirst
      ? new Date(b.creation).getTime() - new Date(a.creation).getTime()
      : new Date(a.creation).getTime() - new Date(b.creation).getTime(),
  )
}

export function sortByModified<T extends AnyRecord>(list: T[]): T[] {
  return [...list].sort((b, a) => new Date(a.modified).getTime() - new Date(b.modified).getTime())
}

export function timelineIcon(activityType: string, isLead?: boolean): IconComponent {
  switch (activityType) {
    case 'creation':
      return isLead ? LeadsIcon : DealsIcon
    case 'deal':
      return DealsIcon
    case 'comment':
      return CommentIcon
    case 'incoming_call':
      return InboundCallIcon
    case 'outgoing_call':
      return OutboundCallIcon
    case 'attachment_log':
      return AttachmentIcon
    default:
      return DotIcon
  }
}

function decorateDetails(activity: AnyRecord, getOwnerName: (owner: string) => string): AnyRecord {
  const decorated: AnyRecord = { ...activity, owner_name: getOwnerName(activity.owner), type: '', value: '', to: '' }
  if (activity.activity_type === 'creation') {
    decorated.type = activity.data
  } else if (activity.activity_type === 'added') {
    decorated.type = 'added'
    decorated.value = 'as'
  } else if (activity.activity_type === 'removed') {
    decorated.type = 'removed'
    decorated.value = 'value'
  } else if (activity.activity_type === 'changed') {
    decorated.type = 'changed'
    decorated.value = 'from'
    decorated.to = 'to'
  }
  return decorated
}

export function decorateActivity(activity: AnyRecord, getOwnerName: (owner: string) => string): AnyRecord {
  const icon = timelineIcon(activity.activity_type, activity.is_lead)
  if (['incoming_call', 'outgoing_call', 'communication'].includes(activity.activity_type)) {
    return { ...activity, icon }
  }
  const decorated = decorateDetails(activity, getOwnerName)
  decorated.icon = icon
  if (activity.other_versions) {
    decorated.other_versions = activity.other_versions.map((version: AnyRecord) =>
      decorateDetails(version, getOwnerName),
    )
  }
  return decorated
}

export interface ActivityEmptyState {
  text: string
  description: string
  icon: IconComponent
}

export function activityEmptyState(title: string): ActivityEmptyState {
  switch (title) {
    case 'Emails':
      return {
        text: __('No Emails Found'),
        description: __('No emails found in your inbox. New messages will appear here soon.'),
        icon: EmailIcon,
      }
    case 'Comments':
      return { text: __('No Comments Found'), description: __('Be the first to add one.'), icon: CommentIcon }
    case 'Data':
      return {
        text: __('No Data Fields Added Yet'),
        description: __('No data fields have been added yet.'),
        icon: DetailsIcon,
      }
    case 'Calls':
      return {
        text: __('No Call History'),
        description: __('No recent calls to display. Log a call or call someone now!'),
        icon: PhoneIcon,
      }
    case 'Notes':
      return {
        text: __('No Notes Found'),
        description: __('Nothing here for now. Add a note to keep track of things.'),
        icon: NoteIcon,
      }
    case 'Tasks':
      return {
        text: __('No Tasks Found'),
        description: __('Nothing to do at the moment. Start organizing by adding one here.'),
        icon: TaskIcon,
      }
    case 'Attachments':
      return {
        text: __('No Attachments Found'),
        description: __('No files have been attached yet. Upload files to see them here.'),
        icon: AttachmentIcon,
      }
    case 'WhatsApp':
      return {
        text: __('No WhatsApp Messages Found'),
        description: __('Start a conversation now!'),
        icon: WhatsAppIcon,
      }
    default:
      return {
        text: __('No Activities Found'),
        description: __('There are no activities to display here. Go ahead and make some changes.'),
        icon: ActivityIcon,
      }
  }
}

function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth
}

export function scrollToActivity(hash: string | null, newestFirst: boolean, routeHash: string): void {
  if (['tasks', 'notes'].includes(routeHash.slice(1))) return
  setTimeout(() => {
    let element: HTMLElement | null | undefined
    if (!hash) {
      const rows = document.getElementsByClassName('activity')
      element = (newestFirst ? rows[0] : rows[rows.length - 1]) as HTMLElement | undefined
    } else {
      element = document.getElementById(hash)
    }
    if (element && !isElementVisible(element)) {
      element.scrollIntoView({ behavior: 'smooth' })
      element.focus()
    }
  }, 500)
}
