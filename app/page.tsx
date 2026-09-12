import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getAccountSummary, getRecipients } from "@/app/actions/bank"
import { Dashboard } from "@/components/dashboard"
import { DatabaseStatus } from "@/components/database-status"

export default async function Page() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return <DatabaseStatus />

  let session
  try {
    session = await auth.api.getSession({ headers: await headers() })
  } catch {
    return <DatabaseStatus />
  }
  if (!session?.user) redirect("/sign-in")

  let summary
  let recipients
  try {
    ;[summary, recipients] = await Promise.all([getAccountSummary(), getRecipients()])
  } catch {
    return <DatabaseStatus />
  }

  return <Dashboard summary={summary} recipients={recipients} />
}
