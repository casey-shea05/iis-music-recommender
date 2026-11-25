import { toast } from 'sonner'
import { useDislikes } from '@/hooks/useDislikes.tsx'
import { TrackThumbnail } from '@/app/components/TrackThumbnail/TrackThumbnail.tsx'
import { Button } from '@/shadcn/button.tsx'

/** Blocked artists, one row each with the track(s) that blocked them. Unblock lets the artist come up again. */
export function BlockedArtistsList() {
  const { blockedArtists, unblock } = useDislikes()

  return (
    <ul className="flex flex-col gap-1">
      {blockedArtists.map(({ id, name, tracks }) => (
        <li key={id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
          <TrackThumbnail track={{ id: tracks[0].id, imageUrl: tracks[0].imageUrl ?? null }} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">Blocked on {tracks.map((t) => t.title).join(', ')}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-label={`Unblock ${name}`}
            onClick={() => {
              unblock(id)
              toast(`${name} can come up again`)
            }}
          >
            Unblock
          </Button>
        </li>
      ))}
    </ul>
  )
}
