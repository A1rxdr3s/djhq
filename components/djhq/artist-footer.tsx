import Link from "next/link"

type Props = {
  artistName: string
  location: string
  bookingEmail: string
  isPro: boolean
}

export function ArtistFooter({ artistName, location, bookingEmail, isPro }: Props) {
  const year = new Date().getFullYear()
  const hasBooking = !!bookingEmail.trim()
  const locationStr = location.replace(/\s*\/\s*/g, " • ")

  return (
    <footer className="border-t border-white/[0.05] px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-7xl lg:flex lg:items-center lg:justify-between">

        {/* Left: name + location */}
        <div>
          <p className="text-[0.95rem] font-black uppercase leading-none tracking-[-0.02em] text-foreground/85">
            {artistName}
          </p>
          {locationStr && (
            <p className="mt-1.5 text-[11px] text-white/28">
              {locationStr}
            </p>
          )}
        </div>

        {/* Right: booking + copyright */}
        <div className="mt-5 lg:mt-0 lg:text-right">
          {hasBooking && (
            <div className="mb-2.5">
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
        <div className="mx-auto mt-4 max-w-7xl border-t border-white/[0.03] pt-3.5">
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
