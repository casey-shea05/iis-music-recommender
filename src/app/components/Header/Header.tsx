import { Button } from '@/shadcn/button.tsx'

/** App title on the left, Start new queue on the right. */
export function Header({ onStartNewQueue }: { onStartNewQueue: () => void }) {
  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <h1 className="text-xl font-semibold">Music Recommender</h1>
      <Button variant="outline" onClick={onStartNewQueue}>
        Start new queue
      </Button>
    </header>
  )
}
