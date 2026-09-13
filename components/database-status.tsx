import { Loader2 } from "lucide-react"

export function DatabaseStatus() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background" aria-busy="true" aria-label="Loading">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
    </main>
  )
}