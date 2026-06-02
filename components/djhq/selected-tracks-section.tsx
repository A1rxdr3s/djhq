import Image from "next/image"
import { Music2 } from "lucide-react"
import type { Playlist } from "@/types/djhq"

const SOURCE_LABELS: Record<string, string> = {
  spotify: "Spotify Playlist",
  soundcloud: "SoundCloud Playlist",
}

type Props = {
  playlist: Playlist
}

export function SelectedTracksSection({ playlist }: Props) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.02]">
      <a
        href={playlist.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-5 p-5 transition-colors duration-150 hover:bg-white/[0.015] sm:gap-6 sm:p-6"
      >
        {/* Square playlist artwork */}
        <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl bg-secondary shadow-md shadow-black/30 sm:h-[110px] sm:w-[110px]">
          {playlist.artworkUrl ? (
            <Image
              src={playlist.artworkUrl}
              alt={`${playlist.title} artwork`}
              fill
              sizes="110px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--accent)/0.28),_transparent_42%),linear-gradient(135deg,_hsl(var(--secondary)),_hsl(var(--background)))]">
              <Music2 className="h-8 w-8 text-accent/60" />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-accent/60">
            {SOURCE_LABELS[playlist.source] ?? "Playlist"}
          </p>
          <h3 className="mt-2 truncate text-lg font-black tracking-[-0.01em] text-foreground md:text-xl">
            {playlist.title}
          </h3>
          <span className="mt-4 inline-flex h-8 items-center rounded-full border border-accent/20 bg-transparent px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-accent transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/[0.08] group-hover:[box-shadow:0_0_14px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
            LISTEN ↗
          </span>
        </div>
      </a>
    </div>
  )
}
