import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { ArrowRight, Check, CreditCard, ShieldCheck } from "lucide-react"

import { auth } from "@/lib/auth"
import { getAccountSummary, getRecipients } from "@/app/actions/bank"
import { MemberFinancialControls } from "@/components/member-financial-controls"
import { TopNav } from "@/components/top-nav"

function PublicCardCatalog() {
  return <main className="min-h-screen bg-[#f5f7f3] text-[#14241f]">
    <header className="border-b border-[#dbe2da] bg-white/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/business-banking" className="flex items-center gap-3 font-semibold tracking-tight"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10251f] text-[#d9f06c]"><CreditCard className="h-5 w-5" /></span>BitNobe cards</Link>
        <div className="flex items-center gap-2"><Link href="/sign-in" className="rounded-full px-4 py-2 text-sm font-medium text-[#52665d] hover:bg-[#eef3eb]">Sign in</Link><Link href="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-[#10251f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b382f]">Open an account <ArrowRight className="h-4 w-4" /></Link></div>
      </div>
    </header>
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
      <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[.16em] text-[#1d7565]">Cards built for daily control</p><h1 className="mt-4 text-4xl font-semibold tracking-[-.04em] sm:text-6xl">Spend with clarity.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-[#60736a]">Choose the card that fits your work, then manage spending, security, and account access from one protected workspace.</p></div>
      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        {[{ name: "Member Debit", tone: "bg-[#123c3a]", description: "Spend directly from your BitNobe checking balance.", points: ["Real-time balance visibility", "Free ATM access", "Purchase monitoring"] }, { name: "Rewards Visa", tone: "bg-[#7d2235]", description: "A flexible credit line for everyday business purchases.", points: ["Credit line sized to approval", "Clear available-credit tracking", "Background-reviewed application"] }].map((card) => <article key={card.name} className="overflow-hidden rounded-2xl border border-[#dbe2da] bg-white shadow-sm"><div className={`relative aspect-[1.9] overflow-hidden ${card.tone} p-6 text-white`}><div className="absolute -right-10 -top-16 h-44 w-44 rounded-full border border-white/20" /><p className="relative text-xs font-semibold uppercase tracking-[.2em] text-white/70">BitNobe</p><p className="relative mt-16 font-mono text-lg tracking-[.22em] text-white/90">••••  ••••  ••••  4826</p><p className="relative mt-2 text-xs uppercase tracking-[.16em] text-white/60">{card.name}</p></div><div className="p-6"><h2 className="text-2xl font-semibold">{card.name}</h2><p className="mt-2 text-sm leading-6 text-[#60736a]">{card.description}</p><ul className="mt-5 space-y-3 text-sm">{card.points.map((point) => <li key={point} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#1d7565]" />{point}</li>)}</ul></div></article>)}
      </div>
      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#cbdcca] bg-[#e9f1e4] p-5 text-sm text-[#385349] sm:flex-row sm:items-center"><ShieldCheck className="h-5 w-5 shrink-0 text-[#1d7565]" /><p>Card numbers, PINs, security codes, and full billing details are protected and never displayed in the public catalog.</p></div>
    </section>
  </main>
}

export default async function CardsPage() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) return <PublicCardCatalog />
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in?next=/cards")

  try {
    const [summary, recipients] = await Promise.all([getAccountSummary(), getRecipients()])
    return <div className="min-h-screen bg-background"><TopNav name={summary.user.name} email={summary.user.email} activeView="accounts" isAdmin={summary.isAdmin} /><main className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><div className="mb-6"><p className="text-sm text-muted-foreground">Member services</p><h1 className="text-3xl font-semibold tracking-tight">Cards & payment access</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Choose a debit or credit card, review its status, and track its available spending capacity.</p></div><MemberFinancialControls mode="cards" recipients={recipients} email={summary.user.email} accountBalance={summary.account.balance} /></main></div>
  } catch {
    return <PublicCardCatalog />
  }
}