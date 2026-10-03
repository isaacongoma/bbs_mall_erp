const REPLY_SELECTORS: Array<{ selector: string; gmail: boolean }> = [
  { selector: 'div.gmail_quote', gmail: true },
  { selector: 'div#appendonsend', gmail: false },
  { selector: 'p.reply-to-content', gmail: false },
]

function randomId(): string {
  return Math.random().toString(36).substring(2, 7)
}

function replaceReplyToContent(doc: Document, element: Element, forGmail: boolean): void {
  const parent = element.parentElement
  if (!parent) return

  const id = randomId()
  const wrapper = doc.createElement('div')
  wrapper.classList.add('replied-content')

  const label = doc.createElement('label')
  label.classList.add('collapse')
  label.setAttribute('for', id)
  label.innerHTML = '...'
  wrapper.appendChild(label)

  const input = doc.createElement('input')
  input.setAttribute('id', id)
  input.setAttribute('class', 'replyCollapser')
  input.setAttribute('type', 'checkbox')
  wrapper.appendChild(input)

  if (forGmail) {
    const previous = element.previousElementSibling
    if (previous && previous.tagName === 'BR') previous.remove()
    const cloned = element.cloneNode(true) as Element
    cloned.classList.remove('gmail_quote')
    wrapper.appendChild(cloned)
  } else {
    const siblings = Array.from(parent.children)
    const index = siblings.indexOf(element)
    const following = siblings.slice(index + 1)
    if (following.length === 0) return

    const container = doc.createElement('div')
    container.append(...following.map((sibling) => sibling.cloneNode(true)))
    wrapper.append(container)

    for (let i = index + 1; i < siblings.length; i++) parent.removeChild(siblings[i]!)
  }

  parent.replaceChild(wrapper, element)
}

export function collapseReplies(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  for (const { selector, gmail } of REPLY_SELECTORS) {
    if (!doc.querySelectorAll(selector).length) continue
    let guard = 0
    for (let element = doc.querySelector(selector); element && guard < 200; element = doc.querySelector(selector)) {
      guard += 1
      const before = doc.body.innerHTML
      replaceReplyToContent(doc, element, gmail)
      if (doc.body.innerHTML === before) break
    }
    return doc.body.innerHTML
  }

  return html
}
