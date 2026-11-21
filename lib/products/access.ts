export type ProductAccess = {
  platformAdmin: boolean
  website: boolean
  set2go: boolean
}

type AccessFacts = {
  userId: string
  platformAdmin: boolean
  ownsWebsite: boolean
  development: boolean
  privateTesting?: boolean
  set2goDeveloperId?: string
}

// Invitations are not linked to authenticated users yet, so only established
// artist ownership authorizes Website access. Platform administration (/admin)
// is a separate privilege and never grants a product entitlement.
// Set2Go has no public production entitlement; its development or private testing identity is explicit.
export function resolveProductAccess(facts: AccessFacts): ProductAccess {
  const set2goDeveloper = (facts.development || facts.privateTesting === true) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facts.set2goDeveloperId ?? '') &&
    facts.userId === facts.set2goDeveloperId

  return {
    platformAdmin: facts.platformAdmin,
    website: facts.ownsWebsite,
    set2go: set2goDeveloper,
  }
}
