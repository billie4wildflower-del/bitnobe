import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getAccountSummary, getRecipients } from "@/app/actions/bank"
import { Dashboard } from "@/components/dashboard"

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const [summary, recipients] = await Promise.all([getAccountSummary(), getRecipients()])

  return <Dashboard summary={summary} recipients={recipients} />
}
