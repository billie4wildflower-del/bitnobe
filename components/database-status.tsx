import { Database, ExternalLink } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DatabaseStatus() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Database className="h-5 w-5" /></div>
          <CardTitle>Database connection required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>BitNobe is running, but this environment is not connected to Postgres yet. Add <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">DATABASE_URL</code> and restart the dev server.</p>
          <p>Authentication also requires <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">BETTER_AUTH_SECRET</code> and <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">BETTER_AUTH_URL</code>.</p>
          <a href="https://www.postgresql.org/docs/current/tutorial-install.html" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-primary hover:underline">Postgres setup guide <ExternalLink className="h-3.5 w-3.5" /></a>
        </CardContent>
      </Card>
    </main>
  )
}