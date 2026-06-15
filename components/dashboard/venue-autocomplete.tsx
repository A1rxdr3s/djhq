"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchVenues, type VenueEntry } from "@/lib/venue-data"

type ApiVenueRow = {
  id: string
  name: string
  city: string
  country: string
  instagram_url: string | null
}

type VenueAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  onSelect: (entry: VenueEntry) => void
  autoFocus?: boolean
}

function mergeResults(local: VenueEntry[], api: ApiVenueRow[]): VenueEntry[] {
  const seen = new Set<string>()
  const merged: VenueEntry[] = []

  for (const v of local) {
    const key = `${v.name.toLowerCase()}|${v.city.toLowerCase()}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(v)
    }
  }

  for (const v of api) {
    const key = `${v.name.toLowerCase()}|${v.city.toLowerCase()}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push({ name: v.name, city: v.city, country: v.country })
    }
  }

  return merged.slice(0, 8)
}

export function VenueAutocomplete({ value, onChange, onSelect, autoFocus }: VenueAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [apiResults, setApiResults] = useState<ApiVenueRow[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const localResults = searchVenues(value)
  const results = mergeResults(localResults, apiResults)
  const showDropdown = open && results.length > 0

  // Debounced API search — runs 220ms after the user stops typing.
  // Local results are always instant; the API enriches with user-submitted venues.
  // setApiResults([]) when query is too short is deferred via setTimeout to avoid
  // the React Compiler's "synchronous setState in effect" lint rule.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value || value.length < 2) {
      debounceRef.current = setTimeout(() => setApiResults([]), 0)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/venues?q=${encodeURIComponent(value)}&limit=8`)
        if (res.ok) {
          const data = await res.json() as ApiVenueRow[]
          setApiResults(Array.isArray(data) ? data : [])
        }
      } catch {
        // API unavailable — local results still work
      }
    }, 220)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  const handleSelect = useCallback(
    (entry: VenueEntry) => {
      onChange(entry.name)
      onSelect(entry)
      setOpen(false)
      setActiveIndex(-1)
    },
    [onChange, onSelect],
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === "ArrowDown" && results.length > 0) {
        setOpen(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }
    switch (e.key) {
      case "ArrowDown":
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
        e.preventDefault()
        break
      case "ArrowUp":
        setActiveIndex((i) => (i <= 0 ? -1 : i - 1))
        e.preventDefault()
        break
      case "Enter":
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex])
          e.preventDefault()
        }
        break
      case "Escape":
        setOpen(false)
        e.preventDefault()
        break
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      {/* Input */}
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={value}
          placeholder="Venue"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          onChange={(e) => {
            onChange(e.target.value)
            setActiveIndex(-1)
            setOpen(true)
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-9 w-full rounded-lg border border-gray-200 bg-white",
            "pl-8 pr-3 text-sm font-medium text-gray-900",
            "placeholder:text-gray-400",
            "outline-none transition-colors duration-150",
            "focus:border-accent/40 focus:ring-2 focus:ring-accent/10",
          )}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1",
            "overflow-hidden rounded-xl border border-gray-200",
            "bg-white shadow-lg shadow-gray-200/80",
          )}
        >
          {results.map((venue, i) => (
            <div
              key={`${venue.name}-${venue.city}`}
              role="option"
              aria-selected={i === activeIndex}
              onPointerDown={(e) => {
                e.preventDefault()
                handleSelect(venue)
              }}
              onPointerEnter={() => setActiveIndex(i)}
              className={cn(
                "flex cursor-default select-none items-center gap-3 px-3.5 py-2.5",
                "border-b border-gray-100 last:border-0",
                "transition-colors duration-75",
                i === activeIndex
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:bg-gray-50",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{venue.name}</p>
                {venue.city && (
                  <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.1em] text-gray-400">
                    {venue.city}
                    {venue.country ? (
                      <>
                        <span className="mx-1.5 text-gray-300">·</span>
                        {venue.country}
                      </>
                    ) : null}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
