import { getUser } from '../stores/usersStore'

export interface Assignee {
  name: string
  image?: string | null
  label: string
}

export function parseAssignees(assignees: string[]): Assignee[] {
  return assignees.map((user) => {
    const details = getUser(user)
    return { name: user, image: details.user_image, label: details.full_name }
  })
}
