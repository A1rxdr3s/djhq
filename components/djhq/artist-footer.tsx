import Link from "next/link"

type Props = {
  artistName: string
  genres: string[]
  location: string
  bookingEmail: string
  tagline?: string
  isPro: boolean
}

export function ArtistFooter({ artistName, genres, location, bookingEmail, tagline, isPro }: Props) {
  const year = new Date().getFullYear()
  const hasBooking = !!bookingEmail.trim()
  const genreStr = genres.join(" / ")
  const locationStr = location.replace(/\s*\/\s*/g, " • ")

  return (
    <footer className="border-t border-white/[0.05] px-4 pt-7 pb-8 sm:px-6 sm:pt-8 sm:pb-10 lg:px-8">
      <div className="mx-auto max-w-7xl lg:flex lg:items-start lg:justify-between">

        {/* Left: artist identity */}
        <div className="space-y-1.5">
          <p className="text-[1.05rem] font-black uppercase leading-none tracking-[-0.02em] text-foreground/90">
            {artistName}
          </p>
          {genreStr && (
            <p className="text-[11px] text-white/32">
              {genreStr}
            </p>
          )}
          {locationStr && (
            <p className="text-[11px] text-white/22">
              {locationStr}
            </p>
          )}
          {tagline && (
            <p className="pt-0.5 text-[11px] text-white/16">
              {tagline}
            </p>
          )}
        </div>

        {/* Right: booking + copyright */}
        <div className="mt-5 space-y-3 lg:mt-0 lg:text-right">
          {hasBooking && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.20em] text-white/22">
                Booking
              </p>
              <a
                href={`mailto:${bookingEmail}`}
                className="mt-1 block text-[11px] text-white/38 transition-colors duration-150 hover:text-accent"
              >
                {bookingEmail}
              </a>
            </div>
          )}
          <p className="text-[10px] text-white/16">
            © {year} {artistName}
          </p>
        </div>

      </div>

      {/* Free plan attribution — absent on pro */}
      {!isPro && (
        <div className="mx-auto mt-5 max-w-7xl border-t border-white/[0.03] pt-4">
          <Link
            href="/"
            className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/14 transition-colors duration-150 hover:text-white/32"
          >
            Powered by DJHQ
          </Link>
        </div>
      )}
    </footer>
  )
}
