import type { Set2GoKey } from '@/lib/i18n/set2go'

export type Destination = { id: 'rekordbox' | 'audio-folder' | 'engine-dj' | 'serato-dj'; name: Set2GoKey; description: Set2GoKey; status: Set2GoKey; available: boolean; visible: boolean }
export const destinations: readonly Destination[] = [
  { id: 'rekordbox', name: 'Rekordbox / Pioneer DJ', description: 'Prepare a Rekordbox export.', status: 'Available now', available: true, visible: true },
  { id: 'audio-folder', name: 'Audio Folder', description: 'Planned: organized audio files.', status: 'Coming soon', available: false, visible: true },
  { id: 'engine-dj', name: 'Denon DJ / Engine DJ', description: 'Planned: Engine DJ export.', status: 'Coming soon', available: false, visible: true },
  { id: 'serato-dj', name: 'Serato DJ', description: 'Planned: Serato library and crate export.', status: 'Coming soon', available: false, visible: false },
]
export const visibleDestinations = destinations.filter(destination => destination.visible)
export function isAvailableDestination(id: Destination['id']): boolean { return destinations.some(destination => destination.id === id && destination.available) }
