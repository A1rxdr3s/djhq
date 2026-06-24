import type { ArtistStoryChapter, ArtistStoryMilestone } from "@/types/djhq"

// ── ANDRES:HERRERA — Artist Story sample data ──────────────────────────────
// Used as the data source until these fields are stored in the DB.
// The ArtistStory component is fully data-driven and has no artist-specific logic.
// Replace these constants with DB-sourced data when the schema supports it.

export const ANDRES_HERRERA_CHAPTERS: ArtistStoryChapter[] = [
  {
    id:         "current-arc",
    title:      "Current Arc",
    rangeLabel: "2024–2026",
    order:      1,
  },
  {
    id:         "origin-arc",
    title:      "Origin Arc",
    rangeLabel: "2008–2023",
    order:      2,
  },
]

export const ANDRES_HERRERA_MILESTONES: ArtistStoryMilestone[] = [
  // ── Current Arc ──────────────────────────────────────────────────────────
  // 2026
  {
    id:          "ah-euro-tour-2026",
    year:        2026,
    category:    "tour",
    title:       "Euro Tour 2026",
    location:    "Europe",
    description: "First European tour spanning key markets.",
    chapterId:   "current-arc",
    importance:  "featured",
    isVisible:   true,
    order:       1,
  },
  {
    id:          "ah-tabu-bali-2026",
    year:        2026,
    category:    "international",
    title:       "TABU Bali",
    location:    "Bali, Indonesia",
    description: "Asian debut at TABU Bali.",
    chapterId:   "current-arc",
    importance:  "major",
    isVisible:   true,
    order:       2,
  },
  // 2025
  {
    id:          "ah-pacha-2025",
    year:        2025,
    category:    "international",
    title:       "Pacha Barcelona",
    location:    "Barcelona, Spain",
    description: "Return appearance at Pacha Barcelona.",
    chapterId:   "current-arc",
    importance:  "major",
    isVisible:   true,
    order:       3,
  },
  {
    id:          "ah-ice-festival-2025",
    year:        2025,
    category:    "festival",
    title:       "ICE Feztival",
    location:    "Viña del Mar, Chile",
    description: "Major festival appearance in Viña del Mar.",
    chapterId:   "current-arc",
    importance:  "major",
    isVisible:   true,
    order:       4,
  },
  {
    id:          "ah-dark-room-mind-2025",
    year:        2025,
    category:    "chart",
    title:       "Dark Room Mind",
    location:    "Beatport",
    description: "Beatport Staff Picks and Best New Hype Tech House recognition.",
    chapterId:   "current-arc",
    importance:  "standard",
    isVisible:   true,
    order:       5,
  },
  {
    id:          "ah-miami-2025",
    year:        2025,
    category:    "international",
    title:       "Miami Music Week",
    location:    "Miami, USA",
    description: "Miami Music Week appearance.",
    chapterId:   "current-arc",
    importance:  "major",
    isVisible:   true,
    order:       6,
  },
  // 2024
  {
    id:          "ah-pacha-2024",
    year:        2024,
    category:    "international",
    title:       "Pacha Barcelona",
    location:    "Barcelona, Spain",
    description: "European debut at Pacha Barcelona.",
    chapterId:   "current-arc",
    importance:  "major",
    isVisible:   true,
    order:       7,
  },
  // ── Origin Arc ───────────────────────────────────────────────────────────
  // 2023
  {
    id:          "ah-club-room-2023",
    year:        2023,
    category:    "residency",
    title:       "Club Room",
    location:    "Santiago, Chile",
    description: "Residency at Club Room in Santiago's electronic music circuit.",
    chapterId:   "origin-arc",
    importance:  "standard",
    isVisible:   true,
    order:       1,
  },
  // 2018
  {
    id:          "ah-misa-2018",
    year:        2018,
    category:    "residency",
    title:       "Misa",
    location:    "Santiago, Chile",
    description: "Long-running residency and defining chapter in the Chilean club history.",
    chapterId:   "origin-arc",
    importance:  "standard",
    isVisible:   true,
    order:       2,
  },
  // 2013
  {
    id:          "ah-sunland-ep-2013",
    year:        2013,
    category:    "release",
    title:       "Sunland EP",
    location:    "Global",
    description: "Vinyl release distributed across Europe and Asia.",
    chapterId:   "origin-arc",
    importance:  "standard",
    isVisible:   true,
    order:       3,
  },
  // 2009
  {
    id:          "ah-la-feria-2009",
    year:        2009,
    category:    "club_show",
    title:       "Club La Feria",
    location:    "Santiago, Chile",
    description: "Early club residency in Santiago.",
    chapterId:   "origin-arc",
    importance:  "minor",
    isVisible:   true,
    order:       4,
  },
  // 2008
  {
    id:          "ah-debut-2008",
    year:        2008,
    category:    "other",
    title:       "Professional Debut",
    location:    "Santiago, Chile",
    description: "Professional debut on the Chilean electronic music circuit.",
    chapterId:   "origin-arc",
    importance:  "minor",
    isVisible:   true,
    order:       5,
  },
]
