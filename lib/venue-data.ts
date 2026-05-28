// Static venue dataset for autocomplete.
// Architecture: replace VENUES array with an API call in a future iteration
// without changing the VenueEntry shape or any consuming component.

export type VenueEntry = {
  name: string
  city: string
  country: string // ISO 3166-1 alpha-2
  aliases?: string[] // alternative search terms
}

export const VENUES: VenueEntry[] = [
  // Berlin
  { name: "Berghain", city: "Berlin", country: "DE", aliases: ["panorama bar"] },
  { name: "Tresor", city: "Berlin", country: "DE" },
  { name: "Watergate", city: "Berlin", country: "DE" },
  { name: "Sisyphos", city: "Berlin", country: "DE" },
  { name: "Arena Club", city: "Berlin", country: "DE" },
  { name: "Kraftwerk Berlin", city: "Berlin", country: "DE", aliases: ["kraftwerk"] },
  { name: "Sage Club", city: "Berlin", country: "DE" },
  { name: "OHM", city: "Berlin", country: "DE" },
  { name: "About Blank", city: "Berlin", country: "DE", aliases: ["aboutblank"] },
  { name: "Griessmuehle", city: "Berlin", country: "DE" },

  // London
  { name: "Fabric", city: "London", country: "UK" },
  { name: "The Cause", city: "London", country: "UK" },
  { name: "EGG London", city: "London", country: "UK", aliases: ["egg london"] },
  { name: "Printworks London", city: "London", country: "UK", aliases: ["printworks"] },
  { name: "Village Underground", city: "London", country: "UK" },
  { name: "Fold London", city: "London", country: "UK", aliases: ["fold"] },
  { name: "Corsica Studios", city: "London", country: "UK" },

  // Ibiza
  { name: "DC10", city: "Ibiza", country: "ES", aliases: ["dc-10"] },
  { name: "Amnesia Ibiza", city: "Ibiza", country: "ES", aliases: ["amnesia"] },
  { name: "Hï Ibiza", city: "Ibiza", country: "ES", aliases: ["hi ibiza"] },
  { name: "Pacha Ibiza", city: "Ibiza", country: "ES", aliases: ["pacha"] },
  { name: "Ushuaïa Ibiza", city: "Ibiza", country: "ES", aliases: ["ushuaia"] },
  { name: "Club Chinois", city: "Ibiza", country: "ES" },

  // Barcelona
  { name: "Razzmatazz", city: "Barcelona", country: "ES" },
  { name: "Nitsa Club", city: "Barcelona", country: "ES", aliases: ["nitsa"] },
  { name: "Sala Apolo", city: "Barcelona", country: "ES", aliases: ["apolo"] },
  { name: "Input Barcelona", city: "Barcelona", country: "ES", aliases: ["input"] },

  // Amsterdam
  { name: "Shelter Amsterdam", city: "Amsterdam", country: "NL", aliases: ["shelter"] },
  { name: "Melkweg", city: "Amsterdam", country: "NL" },
  { name: "Air Amsterdam", city: "Amsterdam", country: "NL" },
  { name: "Warehouse Elementenstraat", city: "Amsterdam", country: "NL", aliases: ["warehouse"] },

  // Miami
  { name: "Club Space", city: "Miami", country: "US" },
  { name: "E11even Miami", city: "Miami", country: "US", aliases: ["e11even"] },
  { name: "Do Not Sit On The Furniture", city: "Miami", country: "US", aliases: ["do not sit"] },

  // New York
  { name: "Nowadays", city: "New York", country: "US" },
  { name: "Market Hotel", city: "New York", country: "US" },
  { name: "Basement NYC", city: "New York", country: "US", aliases: ["basement"] },
  { name: "Good Room", city: "New York", country: "US" },
  { name: "Avant Gardner", city: "New York", country: "US", aliases: ["kings hall"] },

  // Chicago
  { name: "Smart Bar", city: "Chicago", country: "US" },
  { name: "Spybar Chicago", city: "Chicago", country: "US", aliases: ["spybar"] },

  // Los Angeles
  { name: "Academy LA", city: "Los Angeles", country: "US", aliases: ["the academy"] },
  { name: "Sound Nightclub", city: "Los Angeles", country: "US", aliases: ["sound la"] },

  // Paris
  { name: "Rex Club", city: "Paris", country: "FR" },
  { name: "Concrete Paris", city: "Paris", country: "FR", aliases: ["concrete"] },
  { name: "Glazart", city: "Paris", country: "FR" },
  { name: "La Machine du Moulin Rouge", city: "Paris", country: "FR", aliases: ["machine"] },

  // Tokyo
  { name: "Womb Tokyo", city: "Tokyo", country: "JP", aliases: ["womb"] },
  { name: "Contact Tokyo", city: "Tokyo", country: "JP", aliases: ["contact"] },
  { name: "Ageha", city: "Tokyo", country: "JP" },

  // Tbilisi
  { name: "Bassiani", city: "Tbilisi", country: "GE" },
  { name: "Café Gallery", city: "Tbilisi", country: "GE" },

  // Other European
  { name: "Sub Club", city: "Glasgow", country: "UK" },
  { name: "Wire Leeds", city: "Leeds", country: "UK", aliases: ["wire"] },
  { name: "The White Hotel", city: "Manchester", country: "UK", aliases: ["white hotel"] },
  { name: "Fuse Brussels", city: "Brussels", country: "BE", aliases: ["fuse"] },
  { name: "Hive Club", city: "Zurich", country: "CH", aliases: ["hive"] },
  { name: "Stereo Montreal", city: "Montreal", country: "CA", aliases: ["stereo"] },
  { name: "Smolna", city: "Warsaw", country: "PL" },
  { name: "Closer Kiev", city: "Kyiv", country: "UA", aliases: ["closer"] },
  { name: "Akvárium Klub", city: "Budapest", country: "HU", aliases: ["akvarium"] },
  { name: "Cross Club", city: "Prague", country: "CZ" },
  { name: "Goa Club", city: "Rome", country: "IT" },

  // South America
  { name: "D-Edge", city: "São Paulo", country: "BR" },
  { name: "Green Valley", city: "Camboriú", country: "BR" },

  // Australia
  { name: "Revolver Upstairs", city: "Melbourne", country: "AU", aliases: ["revolver"] },
  { name: "Chinese Laundry", city: "Sydney", country: "AU" },

  // Asia
  { name: "Cakeshop", city: "Seoul", country: "KR" },
  { name: "Kilo Lounge", city: "Seoul", country: "KR" },

  // Festivals / Special venues
  { name: "Boiler Room", city: "Various", country: "" },
  { name: "Dekmantel Festival", city: "Amsterdam", country: "NL", aliases: ["dekmantel"] },
  { name: "ADE", city: "Amsterdam", country: "NL", aliases: ["amsterdam dance event"] },
  { name: "Movement Detroit", city: "Detroit", country: "US", aliases: ["movement"] },
  { name: "Sonar Barcelona", city: "Barcelona", country: "ES", aliases: ["sonar"] },
]

export function searchVenues(query: string, limit = 8): VenueEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return VENUES.filter((v) => {
    const nameMatch = v.name.toLowerCase().includes(q)
    const cityMatch = v.city.toLowerCase().includes(q)
    const aliasMatch = v.aliases?.some((a) => a.toLowerCase().includes(q))
    return nameMatch || cityMatch || aliasMatch
  })
    .sort((a, b) => {
      // Prefer name-start matches over mid-string matches
      const aStarts = a.name.toLowerCase().startsWith(q) ? -1 : 0
      const bStarts = b.name.toLowerCase().startsWith(q) ? -1 : 0
      return aStarts - bStarts
    })
    .slice(0, limit)
}
