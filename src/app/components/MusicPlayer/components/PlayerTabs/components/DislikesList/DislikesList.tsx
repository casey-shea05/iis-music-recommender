import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useDislikes } from '@/hooks/useDislikes.tsx'
import { listedDislikes } from '@/recommender/dislikes.ts'
import { Button } from '@/shadcn/button.tsx'
import { TrackThumbnail } from '@/app/components/TrackThumbnail/TrackThumbnail.tsx'
import { artistNames } from '@/utils/format.ts'
import { reasonLabel } from '@/utils/reasonLabel.ts'

/** This session's Dislikes, each with its reasons. Remove drops all of a track's reasons and lets it come up again. */
export function DislikesList() {
  const { dislikes, remove } = useDislikes()
  const listed = listedDislikes(dislikes)

  return (
    <ul className="flex flex-col gap-1">
      {listed.map(({ track, reasons }) => {
        const blocksArtist = reasons.some((r) => r.kind === 'artist')
        return (
          <li key={track.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
            <TrackThumbnail track={track} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{track.title}</p>
              <p className="truncate text-xs text-muted-foreground">{artistNames(track.artists)}</p>
              <p className="text-xs">{reasons.length > 0 ? reasons.map(reasonLabel).join(' · ') : 'No reason given'}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove dislike of ${track.title}`}
              title="Remove this dislike and all its reasons"
              onClick={() => {
                remove(track.id)
                // A kept block still hides the track, so don't promise it will come back.
                toast(
                  blocksArtist
                    ? `Dislike removed. Unblock ${track.artists[0].name} in Blocked artists if you want to hear this track.`
                    : `${track.title} can come up again`,
                )
              }}
            >
              <X />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
