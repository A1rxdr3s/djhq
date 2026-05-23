export function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

export function getTagAttributes(tag: string) {
  const attributes: Record<string, string> = {}
  const attributePattern = /([a-zA-Z:-]+)\s*=\s*["']([^"']*)["']/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(tag))) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2])
  }

  return attributes
}

export function getMetaContent(html: string, names: string[]) {
  const expectedNames = new Set(names.map((name) => name.toLowerCase()))
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []

  for (const tag of metaTags) {
    const attributes = getTagAttributes(tag)
    const metaName = attributes.property ?? attributes.name ?? attributes.itemprop

    if (metaName && expectedNames.has(metaName.toLowerCase()) && attributes.content) {
      return attributes.content
    }
  }

  return null
}

export function getPageTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match?.[1] ? decodeHtml(match[1]) : null
}
