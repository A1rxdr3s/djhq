// Curated city dataset for the gig editor city autocomplete.
// Covers Chile (primary market), global electronic music cities, and major metros.
// Kept intentionally lean: no unfiltered world dump — quality over completeness.

export type CityOption = {
  city: string
  countryCode: string // ISO 3166-1 alpha-2
  country: string
}

// Compact tuple storage: [city, countryCode, country]
type CityTuple = readonly [string, string, string]

const CITY_TUPLES: CityTuple[] = [
  // ── Chile ──────────────────────────────────────────────────────────────────
  ["Santiago", "CL", "Chile"],
  ["Concepción", "CL", "Chile"],
  ["Valparaíso", "CL", "Chile"],
  ["Viña del Mar", "CL", "Chile"],
  ["Temuco", "CL", "Chile"],
  ["Antofagasta", "CL", "Chile"],
  ["La Serena", "CL", "Chile"],
  ["Punta Arenas", "CL", "Chile"],
  ["Puerto Montt", "CL", "Chile"],
  ["Iquique", "CL", "Chile"],
  ["Rancagua", "CL", "Chile"],
  ["Talca", "CL", "Chile"],
  ["Arica", "CL", "Chile"],
  ["Osorno", "CL", "Chile"],
  ["Calama", "CL", "Chile"],
  ["Copiapó", "CL", "Chile"],
  ["Valdivia", "CL", "Chile"],
  ["Chillán", "CL", "Chile"],
  ["Curicó", "CL", "Chile"],
  ["Coyhaique", "CL", "Chile"],
  // ── Germany ────────────────────────────────────────────────────────────────
  ["Berlin", "DE", "Germany"],
  ["Hamburg", "DE", "Germany"],
  ["Munich", "DE", "Germany"],
  ["Frankfurt", "DE", "Germany"],
  ["Cologne", "DE", "Germany"],
  ["Düsseldorf", "DE", "Germany"],
  ["Stuttgart", "DE", "Germany"],
  ["Leipzig", "DE", "Germany"],
  ["Dortmund", "DE", "Germany"],
  ["Mannheim", "DE", "Germany"],
  // ── United Kingdom ─────────────────────────────────────────────────────────
  ["London", "GB", "United Kingdom"],
  ["Manchester", "GB", "United Kingdom"],
  ["Glasgow", "GB", "United Kingdom"],
  ["Leeds", "GB", "United Kingdom"],
  ["Bristol", "GB", "United Kingdom"],
  ["Birmingham", "GB", "United Kingdom"],
  ["Sheffield", "GB", "United Kingdom"],
  ["Newcastle", "GB", "United Kingdom"],
  ["Brighton", "GB", "United Kingdom"],
  ["Edinburgh", "GB", "United Kingdom"],
  ["Belfast", "GB", "United Kingdom"],
  ["Liverpool", "GB", "United Kingdom"],
  // ── Netherlands ────────────────────────────────────────────────────────────
  ["Amsterdam", "NL", "Netherlands"],
  ["Rotterdam", "NL", "Netherlands"],
  ["Utrecht", "NL", "Netherlands"],
  // ── Spain ──────────────────────────────────────────────────────────────────
  ["Barcelona", "ES", "Spain"],
  ["Madrid", "ES", "Spain"],
  ["Ibiza", "ES", "Spain"],
  ["Seville", "ES", "Spain"],
  ["Valencia", "ES", "Spain"],
  ["Bilbao", "ES", "Spain"],
  ["Málaga", "ES", "Spain"],
  ["Palma de Mallorca", "ES", "Spain"],
  // ── France ─────────────────────────────────────────────────────────────────
  ["Paris", "FR", "France"],
  ["Lyon", "FR", "France"],
  ["Marseille", "FR", "France"],
  ["Toulouse", "FR", "France"],
  ["Nice", "FR", "France"],
  ["Bordeaux", "FR", "France"],
  ["Strasbourg", "FR", "France"],
  // ── Italy ──────────────────────────────────────────────────────────────────
  ["Milan", "IT", "Italy"],
  ["Rome", "IT", "Italy"],
  ["Naples", "IT", "Italy"],
  ["Turin", "IT", "Italy"],
  ["Florence", "IT", "Italy"],
  ["Bologna", "IT", "Italy"],
  ["Catania", "IT", "Italy"],
  ["Palermo", "IT", "Italy"],
  // ── Portugal ───────────────────────────────────────────────────────────────
  ["Lisbon", "PT", "Portugal"],
  ["Porto", "PT", "Portugal"],
  // ── Belgium ────────────────────────────────────────────────────────────────
  ["Brussels", "BE", "Belgium"],
  ["Antwerp", "BE", "Belgium"],
  ["Ghent", "BE", "Belgium"],
  // ── Switzerland ────────────────────────────────────────────────────────────
  ["Zurich", "CH", "Switzerland"],
  ["Geneva", "CH", "Switzerland"],
  ["Basel", "CH", "Switzerland"],
  // ── Austria ────────────────────────────────────────────────────────────────
  ["Vienna", "AT", "Austria"],
  ["Salzburg", "AT", "Austria"],
  // ── Czech Republic ─────────────────────────────────────────────────────────
  ["Prague", "CZ", "Czech Republic"],
  // ── Poland ─────────────────────────────────────────────────────────────────
  ["Warsaw", "PL", "Poland"],
  ["Kraków", "PL", "Poland"],
  ["Wrocław", "PL", "Poland"],
  ["Gdańsk", "PL", "Poland"],
  ["Katowice", "PL", "Poland"],
  ["Poznań", "PL", "Poland"],
  // ── Hungary ────────────────────────────────────────────────────────────────
  ["Budapest", "HU", "Hungary"],
  // ── Romania ────────────────────────────────────────────────────────────────
  ["Bucharest", "RO", "Romania"],
  ["Cluj-Napoca", "RO", "Romania"],
  // ── Greece ─────────────────────────────────────────────────────────────────
  ["Athens", "GR", "Greece"],
  ["Thessaloniki", "GR", "Greece"],
  ["Mykonos", "GR", "Greece"],
  ["Santorini", "GR", "Greece"],
  // ── Sweden ─────────────────────────────────────────────────────────────────
  ["Stockholm", "SE", "Sweden"],
  ["Gothenburg", "SE", "Sweden"],
  ["Malmö", "SE", "Sweden"],
  // ── Norway ─────────────────────────────────────────────────────────────────
  ["Oslo", "NO", "Norway"],
  ["Bergen", "NO", "Norway"],
  // ── Denmark ────────────────────────────────────────────────────────────────
  ["Copenhagen", "DK", "Denmark"],
  // ── Finland ────────────────────────────────────────────────────────────────
  ["Helsinki", "FI", "Finland"],
  // ── Ukraine ────────────────────────────────────────────────────────────────
  ["Kyiv", "UA", "Ukraine"],
  ["Kharkiv", "UA", "Ukraine"],
  // ── Georgia ────────────────────────────────────────────────────────────────
  ["Tbilisi", "GE", "Georgia"],
  // ── Russia ─────────────────────────────────────────────────────────────────
  ["Moscow", "RU", "Russia"],
  ["Saint Petersburg", "RU", "Russia"],
  // ── Israel ─────────────────────────────────────────────────────────────────
  ["Tel Aviv", "IL", "Israel"],
  // ── Turkey ─────────────────────────────────────────────────────────────────
  ["Istanbul", "TR", "Turkey"],
  ["Ankara", "TR", "Turkey"],
  // ── Lebanon ────────────────────────────────────────────────────────────────
  ["Beirut", "LB", "Lebanon"],
  // ── United States ──────────────────────────────────────────────────────────
  ["New York", "US", "United States"],
  ["Los Angeles", "US", "United States"],
  ["Chicago", "US", "United States"],
  ["Miami", "US", "United States"],
  ["San Francisco", "US", "United States"],
  ["Detroit", "US", "United States"],
  ["Atlanta", "US", "United States"],
  ["Houston", "US", "United States"],
  ["Las Vegas", "US", "United States"],
  ["Seattle", "US", "United States"],
  ["Austin", "US", "United States"],
  ["Nashville", "US", "United States"],
  ["Washington", "US", "United States"],
  ["Boston", "US", "United States"],
  ["Denver", "US", "United States"],
  ["Minneapolis", "US", "United States"],
  ["New Orleans", "US", "United States"],
  ["Portland", "US", "United States"],
  ["Phoenix", "US", "United States"],
  // ── Canada ─────────────────────────────────────────────────────────────────
  ["Montreal", "CA", "Canada"],
  ["Toronto", "CA", "Canada"],
  ["Vancouver", "CA", "Canada"],
  ["Calgary", "CA", "Canada"],
  // ── Mexico ─────────────────────────────────────────────────────────────────
  ["Mexico City", "MX", "Mexico"],
  ["Guadalajara", "MX", "Mexico"],
  ["Monterrey", "MX", "Mexico"],
  ["Cancún", "MX", "Mexico"],
  ["Tulum", "MX", "Mexico"],
  ["Playa del Carmen", "MX", "Mexico"],
  ["Oaxaca", "MX", "Mexico"],
  // ── Brazil ─────────────────────────────────────────────────────────────────
  ["São Paulo", "BR", "Brazil"],
  ["Rio de Janeiro", "BR", "Brazil"],
  ["Brasília", "BR", "Brazil"],
  ["Salvador", "BR", "Brazil"],
  ["Belo Horizonte", "BR", "Brazil"],
  ["Curitiba", "BR", "Brazil"],
  ["Fortaleza", "BR", "Brazil"],
  ["Recife", "BR", "Brazil"],
  ["Porto Alegre", "BR", "Brazil"],
  ["Florianópolis", "BR", "Brazil"],
  // ── Argentina ──────────────────────────────────────────────────────────────
  ["Buenos Aires", "AR", "Argentina"],
  ["Córdoba", "AR", "Argentina"],
  ["Rosario", "AR", "Argentina"],
  ["Mendoza", "AR", "Argentina"],
  ["Mar del Plata", "AR", "Argentina"],
  // ── Colombia ───────────────────────────────────────────────────────────────
  ["Bogotá", "CO", "Colombia"],
  ["Medellín", "CO", "Colombia"],
  ["Cali", "CO", "Colombia"],
  ["Cartagena", "CO", "Colombia"],
  ["Barranquilla", "CO", "Colombia"],
  // ── Peru ───────────────────────────────────────────────────────────────────
  ["Lima", "PE", "Peru"],
  ["Cusco", "PE", "Peru"],
  // ── Uruguay ────────────────────────────────────────────────────────────────
  ["Montevideo", "UY", "Uruguay"],
  ["Punta del Este", "UY", "Uruguay"],
  // ── Ecuador ────────────────────────────────────────────────────────────────
  ["Quito", "EC", "Ecuador"],
  ["Guayaquil", "EC", "Ecuador"],
  // ── Bolivia ────────────────────────────────────────────────────────────────
  ["La Paz", "BO", "Bolivia"],
  ["Sucre", "BO", "Bolivia"],
  // ── Paraguay ───────────────────────────────────────────────────────────────
  ["Asunción", "PY", "Paraguay"],
  // ── Venezuela ──────────────────────────────────────────────────────────────
  ["Caracas", "VE", "Venezuela"],
  // ── Panama ─────────────────────────────────────────────────────────────────
  ["Panama City", "PA", "Panama"],
  // ── Japan ──────────────────────────────────────────────────────────────────
  ["Tokyo", "JP", "Japan"],
  ["Osaka", "JP", "Japan"],
  ["Kyoto", "JP", "Japan"],
  ["Fukuoka", "JP", "Japan"],
  // ── South Korea ────────────────────────────────────────────────────────────
  ["Seoul", "KR", "South Korea"],
  ["Busan", "KR", "South Korea"],
  // ── China / HK / TW ────────────────────────────────────────────────────────
  ["Shanghai", "CN", "China"],
  ["Beijing", "CN", "China"],
  ["Guangzhou", "CN", "China"],
  ["Shenzhen", "CN", "China"],
  ["Chengdu", "CN", "China"],
  ["Hong Kong", "HK", "Hong Kong"],
  ["Taipei", "TW", "Taiwan"],
  // ── Southeast Asia ─────────────────────────────────────────────────────────
  ["Singapore", "SG", "Singapore"],
  ["Bangkok", "TH", "Thailand"],
  ["Chiang Mai", "TH", "Thailand"],
  ["Bali", "ID", "Indonesia"],
  ["Jakarta", "ID", "Indonesia"],
  ["Kuala Lumpur", "MY", "Malaysia"],
  ["Manila", "PH", "Philippines"],
  ["Ho Chi Minh City", "VN", "Vietnam"],
  ["Hanoi", "VN", "Vietnam"],
  // ── India ──────────────────────────────────────────────────────────────────
  ["Mumbai", "IN", "India"],
  ["Delhi", "IN", "India"],
  ["Bangalore", "IN", "India"],
  ["Chennai", "IN", "India"],
  ["Kolkata", "IN", "India"],
  ["Hyderabad", "IN", "India"],
  ["Goa", "IN", "India"],
  // ── Middle East ────────────────────────────────────────────────────────────
  ["Dubai", "AE", "United Arab Emirates"],
  ["Abu Dhabi", "AE", "United Arab Emirates"],
  ["Doha", "QA", "Qatar"],
  ["Riyadh", "SA", "Saudi Arabia"],
  ["Amman", "JO", "Jordan"],
  ["Cairo", "EG", "Egypt"],
  // ── Africa ─────────────────────────────────────────────────────────────────
  ["Cape Town", "ZA", "South Africa"],
  ["Johannesburg", "ZA", "South Africa"],
  ["Durban", "ZA", "South Africa"],
  ["Nairobi", "KE", "Kenya"],
  ["Lagos", "NG", "Nigeria"],
  ["Accra", "GH", "Ghana"],
  ["Marrakesh", "MA", "Morocco"],
  ["Casablanca", "MA", "Morocco"],
  // ── Australia / NZ ─────────────────────────────────────────────────────────
  ["Sydney", "AU", "Australia"],
  ["Melbourne", "AU", "Australia"],
  ["Brisbane", "AU", "Australia"],
  ["Perth", "AU", "Australia"],
  ["Adelaide", "AU", "Australia"],
  ["Auckland", "NZ", "New Zealand"],
  ["Wellington", "NZ", "New Zealand"],
]

export const CITIES: CityOption[] = CITY_TUPLES.map(([city, countryCode, country]) => ({
  city,
  countryCode,
  country,
}))

// Strips diacritics and lowercases — used for accent-insensitive matching.
function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim()
}

// Precompute normalized names once at module load for O(1) per-entry comparison.
type NormalizedCity = CityOption & { _norm: string; _normCountry: string }

const NORMALIZED: NormalizedCity[] = CITIES.map((c) => ({
  ...c,
  _norm: normalize(c.city),
  _normCountry: normalize(c.country),
}))

/**
 * Returns up to `limit` city matches for `query`.
 * Accent-insensitive. Starts-with matches are ranked first.
 * Also matches on country name (e.g. "chile" returns all Chilean cities).
 */
export function searchCities(query: string, limit = 8): CityOption[] {
  const q = normalize(query)
  if (!q) return []
  return NORMALIZED
    .filter((c) => c._norm.includes(q) || c._normCountry.includes(q))
    .sort((a, b) => {
      const aStarts = a._norm.startsWith(q) ? -1 : 0
      const bStarts = b._norm.startsWith(q) ? -1 : 0
      return aStarts - bStarts
    })
    .slice(0, limit)
}

/**
 * Returns an exact city match for `query` (accent-insensitive).
 * Used for autofill-on-blur: "Concepcion" → Concepción (CL).
 */
export function findCityExact(query: string): CityOption | null {
  const q = normalize(query)
  if (!q) return null
  return NORMALIZED.find((c) => c._norm === q) ?? null
}
