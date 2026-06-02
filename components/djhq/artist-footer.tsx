import Link from "next/link"

type Props = {
  artistName: string
  genres: string[]
  location: string
  bookingEmail: string
  isPro: boolean
}

export function ArtistFooter({ artistName, genres, location, bookingEmail, isPro }: Props) {
  const year = new Date().getFullYear()
  const hasBooking = !!bookingEmail.trim()
  const genreStr = genres.join(" / ")
  const locationStr = location.replace(/\s*\/\s*/g, " • ")

  return (
    <footer className="border-t border-white/[0.05] px-4 pt-8 pb-10 sm:px-6 sm:pt-10 sm:pb-12 lg:px-8">

      {/* Main footer row */}
      <div className="mx-auto max-w-7xl lg:flex lg:items-start lg:justify-between">

        {/* Left: artist identity */}
        <div>
          <p className="text-[0.95rem] font-black uppercase tracking-[-0.01em] text-foreground/80">
            {artistName}
          </p>
          {(genreStr || locationStr) && (
            <p className="mt-1 text-[11px] leading-[1.6] text-white/28">
              {[genreStr, locationStr].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Right: booking + copyright */}
        <div className="mt-6 lg:mt-0 lg:text-right">
          {hasBooking && (
            <div className="mb-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.20em] text-white/22">
                Booking
              </p>
              <a
                href={`mailto:${bookingEmail}`}
                className="mt-0.5 block text-[11px] text-white/40 transition-colors duration-150 hover:text-accent"
              >
                {bookingEmail}
              </a>
            </div>
          )}
          <p className="text-[10px] text-white/18">
            © {year} {artistName}. All Rights Reserved.
          </p>
        </div>

      </div>

      {/* Free plan attribution — white-label on pro */}
      {!isPro && (
        <div className="mx-auto mt-8 max-w-7xl border-t border-white/[0.03] pt-5">
          <Link
            href="/"
            className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/16 transition-colors duration-150 hover:text-white/35"
          >
            Powered by DJHQ
          </Link>
        </div>
      )}

    </footer>
  )
}
