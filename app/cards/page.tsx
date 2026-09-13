import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { getAccountSummary, getRecipients } from "@/app/actions/bank"
import { DatabaseStatus } from "@/components/database-status"
import { MemberFinancialControls } from "@/components/member-financial-controls"
import { TopNav } from "@/components/top-nav"

export default async function CardsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) return <DatabaseStatus />
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in?next=/cards")

  try {
    const [summary, recipients] = await Promise.all([getAccountSummary(), getRecipients()])
    return <div className="min-h-screen bg-background"><TopNav name={summary.user.name} email={summary.user.email} activeView="accounts" isAdmin={summary.isAdmin} /><main className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><div className="mb-6"><p className="text-sm text-muted-foreground">Member services</p><h1 className="text-3xl font-semibold tracking-tight">Cards & payment access</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Choose a debit or credit card, review its status, and track its available spending capacity.</p></div><MemberFinancialControls mode="cards" recipients={recipients} email={summary.user.email} accountBalance={summary.account.balance} /></main></div>
  } catch {
    return <DatabaseStatus />
  }
}