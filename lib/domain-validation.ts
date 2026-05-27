// Server-side apex domain validation for Phase B1 custom domain self-serve.
// B1 supports apex domains only (e.g. "artistdomain.com", "andresherrera.music").
// Subdomains (including www) are not accepted.

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "djhq.com",
  "www.djhq.com",
])

const BLOCKED_SUFFIXES = [".vercel.app", ".ngrok.io", ".ngrok-free.app", ".local"]

// Naive IP address check — reject anything that looks like an IP.
const IP_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/

// Valid DNS label: starts and ends with alphanumeric, allows hyphens in the middle.
const LABEL_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/

export type DomainValidationResult =
  | { ok: true; domain: string }
  | { ok: false; error: string }

export function validateApexDomain(raw: string): DomainValidationResult {
  if (!raw || typeof raw !== "string") {
    return { ok: false, error: "Domain is required." }
  }

  // Strip protocol if accidentally pasted (https://example.com → example.com)
  let domain = raw.trim().toLowerCase()
  domain = domain.replace(/^https?:\/\//i, "")

  // Strip path, query, hash
  const slashIndex = domain.indexOf("/")
  if (slashIndex !== -1) domain = domain.slice(0, slashIndex)
  const queryIndex = domain.indexOf("?")
  if (queryIndex !== -1) domain = domain.slice(0, queryIndex)
  const hashIndex = domain.indexOf("#")
  if (hashIndex !== -1) domain = domain.slice(0, hashIndex)

  // Strip trailing dot (root zone notation)
  domain = domain.replace(/\.$/, "")

  if (!domain) {
    return { ok: false, error: "Domain is required." }
  }

  if (IP_PATTERN.test(domain)) {
    return { ok: false, error: "IP addresses are not supported. Enter a domain name." }
  }

  if (BLOCKED_HOSTNAMES.has(domain)) {
    return { ok: false, error: "This domain cannot be used." }
  }

  for (const suffix of BLOCKED_SUFFIXES) {
    if (domain.endsWith(suffix)) {
      return { ok: false, error: "This domain cannot be used." }
    }
  }

  // Check current app host
  const appHost = (process.env.NEXT_PUBLIC_APP_URL ?? "https://djhq.vercel.app")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
  if (domain === appHost) {
    return { ok: false, error: "This domain cannot be used." }
  }

  if (domain.length > 253) {
    return { ok: false, error: "Domain name is too long." }
  }

  const labels = domain.split(".")

  // Must have at least 2 labels (e.g. "artist.com") and a real TLD
  if (labels.length < 2) {
    return { ok: false, error: "Enter a full domain name (e.g. yourname.com)." }
  }

  // B1: apex only — reject subdomains (more than 2 labels = subdomain)
  if (labels.length > 2) {
    return {
      ok: false,
      error: "Only apex domains are supported (e.g. yourname.com). Subdomains including www are not yet supported.",
    }
  }

  // Validate each label
  for (const label of labels) {
    if (label.length === 0) {
      return { ok: false, error: "Invalid domain format." }
    }
    if (label.length > 63) {
      return { ok: false, error: "Domain label is too long (max 63 characters per segment)." }
    }
    if (!LABEL_PATTERN.test(label)) {
      return { ok: false, error: "Domain contains invalid characters." }
    }
  }

  // TLD must be at least 2 characters
  const tld = labels[labels.length - 1]
  if (tld.length < 2) {
    return { ok: false, error: "Domain has an invalid TLD." }
  }

  // TLD must not be purely numeric (e.g. "192.168")
  if (/^\d+$/.test(tld)) {
    return { ok: false, error: "Domain has an invalid TLD." }
  }

  return { ok: true, domain }
}
