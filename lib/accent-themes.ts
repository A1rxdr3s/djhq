export type AccentThemeKey = "matrix" | "electric_blue" | "signal_red"

export type AccentThemeConfig = {
  name: string
  value: AccentThemeKey
  description: string
  accent: string
  accentForeground: string
  glowRgb: string
  hex: string
}

export const ACCENT_THEMES: Record<AccentThemeKey, AccentThemeConfig> = {
  matrix: {
    name: "Matrix",
    value: "matrix",
    description: "DJHQ signature green",
    accent: "oklch(0.75 0.18 160)",
    accentForeground: "oklch(0.08 0 0)",
    glowRgb: "0, 230, 167",
    hex: "#00E6A7",
  },
  electric_blue: {
    name: "Electric Blue",
    value: "electric_blue",
    description: "Progressive / Melodic",
    accent: "oklch(0.75 0.17 222)",
    accentForeground: "oklch(0.08 0 0)",
    glowRgb: "24, 184, 255",
    hex: "#18B8FF",
  },
  signal_red: {
    name: "Signal Red",
    value: "signal_red",
    description: "Club / Festival",
    accent: "oklch(0.72 0.20 22)",
    accentForeground: "oklch(0.08 0 0)",
    glowRgb: "255, 94, 94",
    hex: "#FF5E5E",
  },
}

export function getAccentTheme(key: string | undefined): AccentThemeConfig {
  return ACCENT_THEMES[(key as AccentThemeKey) ?? "matrix"] ?? ACCENT_THEMES.matrix
}
