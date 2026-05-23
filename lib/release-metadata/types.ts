export type ReleaseType = "single" | "ep" | "album"

export type ReleaseProvider = "beatport" | "spotify"

/**
 * Normalized release metadata from a public platform URL.
 * Structured for future multi-release / discography imports.
 */
export type ImportedReleaseMetadata = {
  provider: ReleaseProvider
  title: string | null
  artist: string | null
  label: string | null
  releaseDate: string | null
  type: ReleaseType | null
  platformUrl: string
  artworkUrl: string | null
}
