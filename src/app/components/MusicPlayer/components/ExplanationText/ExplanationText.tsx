import { usePlayback } from '@/hooks/usePlayback.tsx'
import { cn } from '@/shadcn/utils.ts'
import { explanationText } from '@/utils/explanationText.ts'
import type { PlayerVariant } from '../../variant.ts'

/** Why Now playing was picked, as a thin black strip: under the bar, and pinned to the bottom of the expanded view. Renders nothing without an explanation. */
export function ExplanationText({ variant = 'bar', className }: { variant?: PlayerVariant; className?: string }) {
  const { explanation, topArtists } = usePlayback()
  if (!explanation) return null
  return (
    <p
      className={cn(
        'truncate bg-primary px-4 py-1 text-center text-xs text-primary-foreground',
        variant === 'expanded' && 'sticky bottom-0 shrink-0 py-2 text-sm',
        className,
      )}
    >
      {explanationText(explanation, topArtists)}
    </p>
  )
}
