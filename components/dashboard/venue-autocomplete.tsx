"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchVenues, type VenueEntry } from "@/lib/venue-data"

type VenueAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  onSelect: (entry: VenueEntry) => void
}

export function VenueAutocomplete({ value, onChange, onSelect }: VenueAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = searchVenues(value)
  const showDropdown = open && results.length > 0

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
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/30" />
        <input
          ref={inputRef}
          value={value}
          placeholder="Venue"
          autoComplete="off"
          spellCheck={false}
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
            "h-9 w-full rounded-lg border border-white/[0.07] bg-white/[0.025]",
            "pl-8 pr-3 text-sm font-medium text-foreground",
            "placeholder:text-muted-foreground/30",
            "outline-none transition-colors duration-150",
            "focus:border-white/[0.14] focus:bg-white/[0.04]",
          )}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1",
            "overflow-hidden rounded-xl border border-white/[0.09]",
            "bg-[hsl(var(--card))] shadow-2xl shadow-black/50",
          )}
        >
          {results.map((venue, i) => (
            <div
              key={`${venue.name}-${venue.city}`}
              role="option"
              aria-selected={i === activeIndex}
              // Use onPointerDown so focus stays in input
              onPointerDown={(e) => {
                e.preventDefault()
                handleSelect(venue)
              }}
              onPointerEnter={() => setActiveIndex(i)}
              className={cn(
                "flex cursor-default select-none items-center gap-3 px-3.5 py-2.5",
                "border-b border-white/[0.04] last:border-0",
                "transition-colors duration-75",
                i === activeIndex
                  ? "bg-white/[0.07] text-foreground"
                  : "text-foreground/80 hover:bg-white/[0.04]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{venue.name}</p>
                {venue.city && (
                  <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/45">
                    {venue.city}
                    {venue.country ? (
                      <>
                        <span className="mx-1.5 text-muted-foreground/25">·</span>
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
