import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type TourScheduleGig = {
  id: string
  date: string       // YYYY-MM-DD
  eventName?: string
  venue: string
  city?: string
}

export type TourScheduleStay = {
  id: string
  city: string
  startsOn: string   // YYYY-MM-DD
  endsOn: string     // YYYY-MM-DD
  color: string      // hex e.g. "#22c55e"
}

type Props = {
  tourName: string
  artistName: string
  startDate: string
  endDate: string
  gigs: TourScheduleGig[]
  stays: TourScheduleStay[]
  heroImageUrl?: string | null
  handle: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const MONTH_SHORT = MONTH_FULL.map(m => m.slice(0, 3))
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

function toDateKey(raw: string): string { return raw.slice(0, 10) }

function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}

function getDow(dateStr: string): string { return DOW[parseDate(dateStr).getDay()] }
function getDay(dateStr: string): number { return parseInt(dateStr.slice(8)) }
function getMonthShort(dateStr: string): string { return MONTH_SHORT[parseInt(dateStr.slice(5, 7)) - 1] }
function getYear(dateStr: string): number { return parseInt(dateStr.slice(0, 4)) }

function fmtShort(dateStr: string): string {
  return `${getMonthShort(dateStr)} ${getDay(dateStr)}`
}

function fmtLong(dateStr: string): string {
  const d = parseDate(dateStr)
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function fmtTourRange(start: string, end: string): string {
  const s = parseDate(start)
  const e = parseDate(end)
  const sStr = `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}`
  const eStr = `${MONTH_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`
  if (s.getFullYear() !== e.getFullYear()) {
    return `${sStr}, ${s.getFullYear()} – ${eStr}`
  }
  return `${sStr} – ${eStr}`
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function serverToday(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Chapter type ─────────────────────────────────────────────────────────────

type Chapter = {
  stay: TourScheduleStay
  gigs: TourScheduleGig[]
  nextStay: TourScheduleStay | null
}

// ─── Root Component ───────────────────────────────────────────────────────────

export function PublicTourSchedule({
  tourName, artistName, startDate, endDate, gigs, stays, heroImageUrl, handle,
}: Props) {
  const today = serverToday()
  const hasHeroImg = typeof heroImageUrl === "string" && heroImageUrl.startsWith("http")

  const sortedGigs = [...gigs].sort((a, b) => toDateKey(a.date).localeCompare(toDateKey(b.date)))
  const sortedStays = [...stays].sort((a, b) => a.startsOn.localeCompare(b.startsOn))

  const nextShow = sortedGigs.find(g => toDateKey(g.date) >= today) ?? null
  const currentStay = sortedStays.find(s => s.startsOn <= today && today <= s.endsOn) ?? null

  const chapters: Chapter[] = sortedStays.map((stay, i) => ({
    stay,
    gigs: sortedGigs.filter(g => {
      const d = toDateKey(g.date)
      if (d < stay.startsOn || d > stay.endsOn) return false
      // When this stay's end date is also the next stay's start date (same-day handoff),
      // assign gigs on that date to the incoming city, not the outgoing one.
      const nextStay = sortedStays[i + 1] ?? null
      if (nextStay && d === stay.endsOn && nextStay.startsOn === stay.endsOn) return false
      return true
    }),
    nextStay: sortedStays[i + 1] ?? null,
  }))

  const coveredIds = new Set(chapters.flatMap(c => c.gigs.map(g => g.id)))
  const orphanGigs = sortedGigs.filter(g => !coveredIds.has(g.id))

  // ── No Tour state ──────────────────────────────────────────────────────────
  if (gigs.length === 0 && stays.length === 0) {
    return (
      <NoTourState artistName={artistName} handle={handle} hasHeroImg={hasHeroImg} heroImageUrl={heroImageUrl} />
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.08 0 0)", color: "#F5F5F3" }}
    >
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <TourHero
        tourName={tourName}
        artistName={artistName}
        dateRange={fmtTourRange(startDate, endDate)}
        showCount={gigs.length}
        heroImageUrl={hasHeroImg ? heroImageUrl! : null}
        nextShow={nextShow}
        handle={handle}
      />

      {/* ── City route thread ────────────────────────────────────────────────── */}
      {sortedStays.length > 1 && (
        <CityRoute stays={sortedStays} today={today} />
      )}

      {/* ── Schedule body ────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[640px] px-5 py-16 sm:px-8 sm:py-20">

        {/* Current city callout */}
        {currentStay && (
          <div
            className="mb-14 flex items-center gap-3"
          >
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: currentStay.color }}
            />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "rgba(245,245,243,0.38)" }}
            >
              Currently in
            </span>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: currentStay.color }}
            >
              {currentStay.city}
            </span>
          </div>
        )}

        {/* Chapters */}
        <div>
          {chapters.map((chapter, ci) => (
            <div key={chapter.stay.id}>
              <CityChapter
                stay={chapter.stay}
                gigs={chapter.gigs}
                today={today}
                isFirst={ci === 0}
              />
              {chapter.nextStay && (
                <TravelTransition from={chapter.stay} to={chapter.nextStay} />
              )}
            </div>
          ))}

          {/* Orphan gigs — no stay coverage */}
          {orphanGigs.length > 0 && (
            <div className="mt-14 space-y-3">
              {orphanGigs.map(gig => (
                <PerformanceRow key={gig.id} gig={gig} color={null} today={today} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div
        className="px-5 py-8 sm:px-8"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="mx-auto max-w-[640px]">
          <a
            href={`/${handle}`}
            className="text-[11px] font-medium uppercase tracking-[0.16em] transition-colors hover:text-white/55"
            style={{ color: "rgba(245,245,243,0.22)" }}
          >
            ← {artistName}
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function TourHero({
  tourName, artistName, dateRange, showCount, heroImageUrl, nextShow, handle,
}: {
  tourName: string
  artistName: string
  dateRange: string
  showCount: number
  heroImageUrl: string | null
  nextShow: TourScheduleGig | null
  handle: string
}) {
  return (
    <div className="relative overflow-hidden" style={{ minHeight: "56vh" }}>
      {/* Background image */}
      {heroImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.15, filter: "blur(3px)", transform: "scale(1.06)" }}
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: heroImageUrl
            ? "linear-gradient(160deg, oklch(0.08 0 0) 0%, oklch(0.08 0 0 / 0.55) 45%, oklch(0.08 0 0 / 0.9) 75%, oklch(0.08 0 0) 100%)"
            : "radial-gradient(ellipse at 30% -20%, oklch(0.75 0.18 160 / 0.10) 0%, transparent 65%)",
        }}
      />

      {/* Content */}
      <div className="relative mx-auto max-w-[640px] px-5 pb-16 pt-12 sm:px-8 sm:pt-16 sm:pb-20">

        {/* Artist breadcrumb */}
        <a
          href={`/${handle}`}
          className="mb-8 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.22em] transition-colors hover:text-white/60"
          style={{ color: "rgba(245,245,243,0.28)" }}
        >
          <span>←</span>
          <span>{artistName}</span>
        </a>

        {/* Tour name */}
        <h1
          className="break-words font-black uppercase leading-[0.90] tracking-[-0.03em]"
          style={{ fontSize: "clamp(1.8rem, 8vw, 5.5rem)" }}
        >
          {tourName}
        </h1>

        {/* Date + show count */}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className="text-[12px] font-medium uppercase tracking-[0.14em]"
            style={{ color: "rgba(245,245,243,0.38)" }}
          >
            {dateRange}
          </span>
          {showCount > 0 && (
            <>
              <span style={{ color: "rgba(245,245,243,0.15)" }}>·</span>
              <span
                className="text-[12px] font-bold"
                style={{ color: "oklch(0.75 0.18 160 / 0.75)" }}
              >
                {showCount} {showCount === 1 ? "show" : "shows"}
              </span>
            </>
          )}
        </div>

        {/* Next show card */}
        {nextShow && (
          <div
            className="mt-10 inline-flex flex-col gap-1.5 rounded-lg px-5 py-4"
            style={{
              background: "oklch(0.75 0.18 160 / 0.07)",
              border: "1px solid oklch(0.75 0.18 160 / 0.14)",
            }}
          >
            <span
              className="text-[9px] font-bold uppercase tracking-[0.24em]"
              style={{ color: "oklch(0.75 0.18 160 / 0.65)" }}
            >
              Next show
            </span>
            <span className="text-[16px] font-bold leading-tight" style={{ color: "#F5F5F3" }}>
              {nextShow.eventName || nextShow.city || nextShow.venue}
            </span>
            <span className="text-[12px]" style={{ color: "rgba(245,245,243,0.38)" }}>
              {getDow(toDateKey(nextShow.date))}, {fmtLong(toDateKey(nextShow.date))}
              {nextShow.city && ` · ${nextShow.city}`}
            </span>
          </div>
        )}
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 80,
          background: "linear-gradient(to bottom, transparent, oklch(0.08 0 0))",
          pointerEvents: "none",
        }}
        aria-hidden
      />
    </div>
  )
}

// ─── City Route ───────────────────────────────────────────────────────────────

function CityRoute({ stays, today }: { stays: TourScheduleStay[]; today: string }) {
  return (
    <div
      className="overflow-x-auto"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div
        className="flex items-center px-5 py-4 sm:px-8"
        style={{ minWidth: "max-content", gap: 0 }}
      >
        {stays.map((stay, i) => {
          const isCurrent = stay.startsOn <= today && today <= stay.endsOn
          const isPast = today > stay.endsOn
          const dotOpacity = isCurrent ? 1 : isPast ? 0.3 : 0.6

          return (
            <div key={stay.id} className="flex items-center">
              {/* City node */}
              <div className="flex flex-col items-center" style={{ gap: 6 }}>
                {/* Dot */}
                <div
                  className="rounded-full"
                  style={{
                    width: isCurrent ? 9 : 6,
                    height: isCurrent ? 9 : 6,
                    background: hexToRgba(stay.color, dotOpacity),
                    boxShadow: isCurrent ? `0 0 12px 2px ${hexToRgba(stay.color, 0.35)}` : "none",
                    transition: "all 0.2s",
                  }}
                />
                {/* City label */}
                <span
                  className="text-[8.5px] font-semibold uppercase tracking-[0.12em]"
                  style={{
                    color: isCurrent ? stay.color : isPast ? "rgba(245,245,243,0.20)" : "rgba(245,245,243,0.42)",
                    textAlign: "center",
                    maxWidth: 56,
                    lineHeight: 1.15,
                  }}
                >
                  {stay.city}
                </span>
              </div>

              {/* Connector */}
              {i < stays.length - 1 && (
                <div
                  style={{
                    width: 32,
                    height: 1,
                    background: "rgba(255,255,255,0.07)",
                    margin: "0 10px",
                    marginBottom: 16,
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── City Chapter ─────────────────────────────────────────────────────────────

function CityChapter({
  stay, gigs, today, isFirst,
}: {
  stay: TourScheduleStay
  gigs: TourScheduleGig[]
  today: string
  isFirst: boolean
}) {
  const isCurrent = stay.startsOn <= today && today <= stay.endsOn

  return (
    <div className={isFirst ? "" : "mt-16"}>
      {/* City header */}
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div
            className="h-[7px] w-[7px] rounded-full flex-shrink-0"
            style={{
              background: stay.color,
              boxShadow: isCurrent ? `0 0 8px ${hexToRgba(stay.color, 0.5)}` : "none",
            }}
          />
          <h2
            className="font-bold uppercase tracking-[0.10em]"
            style={{
              fontSize: 14,
              color: stay.color,
              letterSpacing: "0.10em",
            }}
          >
            {stay.city}
          </h2>
          {isCurrent && (
            <span
              className="rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]"
              style={{
                background: hexToRgba(stay.color, 0.12),
                color: stay.color,
              }}
            >
              Now
            </span>
          )}
        </div>
        <span
          className="shrink-0 text-[11px] font-medium tabular-nums"
          style={{ color: "rgba(245,245,243,0.28)" }}
        >
          {fmtShort(stay.startsOn)} – {fmtShort(stay.endsOn)}
        </span>
      </div>

      {/* Divider */}
      <div
        className="mb-6"
        style={{ height: 1, background: hexToRgba(stay.color, 0.12) }}
      />

      {/* Performances */}
      {gigs.length > 0 ? (
        <div className="space-y-2.5">
          {gigs.map(gig => (
            <PerformanceRow key={gig.id} gig={gig} color={stay.color} today={today} />
          ))}
        </div>
      ) : (
        <p
          className="py-2 text-[12px]"
          style={{ color: "rgba(245,245,243,0.18)" }}
        >
          No shows scheduled for this stop.
        </p>
      )}
    </div>
  )
}

// ─── Performance Row ──────────────────────────────────────────────────────────

function PerformanceRow({
  gig, color, today,
}: {
  gig: TourScheduleGig
  color: string | null
  today: string
}) {
  const dateKey = toDateKey(gig.date)
  const isPast = dateKey < today
  const isTonight = dateKey === today
  const accentColor = color ?? "oklch(0.75 0.18 160)"
  const accentRgba = color ? hexToRgba(color, 0.08) : "oklch(0.75 0.18 160 / 0.06)"
  const accentBorder = color ? hexToRgba(color, 0.15) : "oklch(0.75 0.18 160 / 0.14)"

  const primaryLabel = gig.eventName || gig.city || gig.venue
  // Only show venue in secondary if it differs from the event name (avoids "Tantra · Ibiza" when venue === event)
  const secondaryLabel = gig.eventName
    ? [gig.venue !== gig.eventName ? gig.venue : null, gig.city].filter(Boolean).join(" · ") || null
    : null

  return (
    <div
      className="flex items-start gap-5 rounded-lg px-4 py-4 sm:px-5 sm:py-4"
      style={{
        background: isPast
          ? "oklch(0.10 0 0 / 0.7)"
          : accentRgba,
        border: `1px solid ${isPast ? "rgba(255,255,255,0.04)" : accentBorder}`,
        opacity: isPast ? 0.48 : 1,
      }}
    >
      {/* Date column */}
      <div className="w-11 shrink-0 text-center sm:w-12">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.10em]"
          style={{ color: "rgba(245,245,243,0.32)" }}
        >
          {getDow(dateKey)}
        </div>
        <div
          className="font-black leading-none"
          style={{
            fontSize: "2.5rem",
            marginTop: 2,
            color: isPast
              ? "rgba(245,245,243,0.18)"
              : (color ?? "oklch(0.75 0.18 160)"),
          }}
        >
          {getDay(dateKey)}
        </div>
        <div
          className="text-[9.5px] font-medium uppercase tracking-[0.06em]"
          style={{ color: "rgba(245,245,243,0.22)", marginTop: 1 }}
        >
          {getMonthShort(dateKey)}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-1">
        <div
          className="font-bold leading-snug"
          style={{
            fontSize: 17,
            color: isPast ? "rgba(245,245,243,0.55)" : "#F5F5F3",
          }}
        >
          {primaryLabel}
        </div>
        {secondaryLabel && (
          <div
            className="mt-0.5 text-[12px]"
            style={{ color: "rgba(245,245,243,0.32)" }}
          >
            {secondaryLabel}
          </div>
        )}
        {!gig.eventName && gig.venue && gig.city && (
          <div
            className="mt-0.5 text-[12px]"
            style={{ color: "rgba(245,245,243,0.32)" }}
          >
            {gig.venue}
          </div>
        )}
      </div>

      {/* Tonight badge */}
      {isTonight && (
        <div
          className="shrink-0 self-center rounded px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{
            background: "oklch(0.75 0.18 160 / 0.14)",
            color: "oklch(0.75 0.18 160)",
          }}
        >
          Tonight
        </div>
      )}
    </div>
  )
}

// ─── Travel Transition ────────────────────────────────────────────────────────

function TravelTransition({ from, to }: { from: TourScheduleStay; to: TourScheduleStay }) {
  return (
    <div
      className="my-10 flex items-center gap-4"
      aria-hidden
    >
      <div className="flex-1" style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
      <div
        className="flex items-center gap-2 text-[9.5px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: "rgba(245,245,243,0.18)" }}
      >
        <span style={{ color: hexToRgba(from.color, 0.55) }}>{from.city}</span>
        <span>→</span>
        <span style={{ color: hexToRgba(to.color, 0.55) }}>{to.city}</span>
      </div>
      <div className="flex-1" style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />
    </div>
  )
}

// ─── No Tour State ────────────────────────────────────────────────────────────

function NoTourState({
  artistName, handle, hasHeroImg, heroImageUrl,
}: {
  artistName: string
  handle: string
  hasHeroImg: boolean
  heroImageUrl?: string | null
}) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center px-5 py-24 text-center"
      style={{ background: "oklch(0.08 0 0)", color: "#F5F5F3" }}
    >
      {/* Ambient image */}
      {hasHeroImg && heroImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.06, filter: "blur(4px)", transform: "scale(1.06)" }}
        />
      )}

      {/* Radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 42%, oklch(0.75 0.18 160 / 0.06) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
        aria-hidden
      />

      <div className="relative max-w-xs">
        {/* Accent mark */}
        <div
          className="mx-auto mb-10 rounded-full"
          style={{ width: 32, height: 2, background: "oklch(0.75 0.18 160 / 0.60)" }}
        />

        {/* Heading */}
        <h1
          className="font-black uppercase leading-none tracking-[-0.02em]"
          style={{ fontSize: "clamp(2.2rem, 7vw, 3.8rem)" }}
        >
          No active tour
        </h1>

        {/* Body */}
        <p
          className="mx-auto mt-5 text-[14px] leading-relaxed"
          style={{ color: "rgba(245,245,243,0.33)", maxWidth: "26ch" }}
        >
          {artistName} has no tour scheduled at this time. Check back for upcoming dates.
        </p>

        {/* Back link */}
        <a
          href={`/${handle}`}
          className="mt-12 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors hover:text-white/60"
          style={{ color: "rgba(245,245,243,0.28)" }}
        >
          ← {artistName}
        </a>
      </div>
    </div>
  )
}
