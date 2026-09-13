"use client"

import { useState } from "react"
import Link from "next/link"
import { Banknote, CheckCircle2, Copy, FileText, HelpCircle, LockKeyhole, Send, ShieldCheck, WalletCards } from "lucide-react"

import { formatCents, maskAccount } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TopNav, type WorkspaceView } from "@/components/top-nav"
import { TransactionsList, type Transaction } from "@/components/transactions-list"
import { SendMoneyDialog, type Recipient } from "@/components/send-money-dialog"
import { MemberFinancialControls } from "@/components/member-financial-controls"

type Summary = {
  user: { id: string; name: string; email: string }
  account: { accountNumber: string; routingNumber: string; balance: number; status: "active" | "dormant" | "restricted" | "closed" | "suspended"; fraudFreeze: boolean }
  transactions: Transaction[]
  isAdmin: boolean
}

export function Dashboard({ summary, recipients }: { summary: Summary; recipients: Recipient[] }) {
  const [activeView, setActiveView] = useState<WorkspaceView>("overview")
  const [sendOpen, setSendOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { user, account, transactions } = summary

  async function copyAccount(value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function openTransfers() {
    setActiveView("transfers")
    setSendOpen(true)
  }

  return (
    <div className="min-h-screen bg-transparent">
      <TopNav name={user.name} email={user.email} activeView={activeView} onViewChange={setActiveView} isAdmin={summary.isAdmin} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Member workspace</p>
            <h1 className="text-3xl font-semibold tracking-tight capitalize text-foreground">{activeView}</h1>
          </div>
          {activeView !== "support" && (
            <Button onClick={openTransfers} className="h-10 rounded-full bg-[#10251f] text-white hover:bg-[#173c36]">
              <Send className="mr-2 h-4 w-4" />
              New transfer
            </Button>
          )}
        </div>
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-full border border-border/80 bg-white/70 p-1 md:hidden">
          {(["overview", "accounts", "transfers", "activity", "support"] as WorkspaceView[]).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setActiveView(view)}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-sm capitalize transition-colors ${activeView === view ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {view}
            </button>
          ))}
        </div>

        {activeView === "overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="hero-accent overflow-hidden border-0 bg-[#10251f] text-primary-foreground shadow-[0_20px_60px_-30px_rgba(16,37,31,0.46)] lg:col-span-2">
              <CardContent className="p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-primary-foreground/80"><WalletCards className="h-4 w-4" />Available balance</div>
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#d9f06c]">Protected</span>
                </div>
                <p className="mt-6 font-mono text-4xl font-semibold tracking-tight sm:text-5xl">{formatCents(account.balance)}</p>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                  <div>
                    <p className="text-primary-foreground/70">Account number</p>
                    <button onClick={() => copyAccount(account.accountNumber)} className="mt-0.5 flex items-center gap-1.5 font-mono font-medium text-white">
                      {maskAccount(account.accountNumber)}
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div>
                    <p className="text-primary-foreground/70">Routing number</p>
                    <p className="mt-0.5 font-mono font-medium text-white">{account.routingNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-0 bg-white/70">
              <CardHeader><CardTitle className="text-sm text-muted-foreground">Account standing</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3"><CheckCircle2 className={`h-5 w-5 ${account.status === "active" ? "text-emerald-600" : "text-amber-600"}`} /><div><p className="font-medium capitalize">{account.status}</p><p className="text-xs text-muted-foreground">{account.status === "active" && !account.fraudFreeze ? "No restrictions" : "Some account actions may be limited"}</p></div></div>
                <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3"><ShieldCheck className={`h-5 w-5 ${account.fraudFreeze ? "text-amber-600" : "text-emerald-600"}`} /><div><p className="font-medium">{account.fraudFreeze ? "Under review" : "Protected"}</p><p className="text-xs text-muted-foreground">BitNobe monitored</p></div></div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-0 bg-white/70 lg:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Recent activity</CardTitle><CardDescription>Transfers and bank-posted account activity.</CardDescription></div>
                <Button variant="outline" size="sm" onClick={() => setActiveView("activity")}>View all</Button>
              </CardHeader>
              <CardContent><TransactionsList transactions={transactions.slice(0, 5)} currentUserId={user.id} /></CardContent>
            </Card>
          </div>
        )}

        {activeView === "accounts" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="glass-panel border-0 bg-white/80"><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" />BitNobe checking</CardTitle><CardDescription>Primary member account</CardDescription></CardHeader><CardContent className="space-y-5"><div><p className="text-sm text-muted-foreground">Available balance</p><p className="mt-1 text-3xl font-semibold">{formatCents(account.balance)}</p></div><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground">Account number</p><button onClick={() => copyAccount(account.accountNumber)} className="mt-1 font-mono text-foreground">{maskAccount(account.accountNumber)} {copied ? "Copied" : "Copy"}</button></div><div><p className="text-muted-foreground">Routing number</p><p className="mt-1 font-mono text-foreground">{account.routingNumber}</p></div></div></CardContent></Card>
              <Card className="glass-panel border-0 bg-white/80"><CardHeader><CardTitle>Funding and security</CardTitle><CardDescription>How your account is managed</CardDescription></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex gap-3"><LockKeyhole className="h-5 w-5 shrink-0 text-primary" /><p>Balances can only be posted by authorized BitNobe bank operations.</p></div><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><p>Every internal transfer is recorded and processed atomically.</p></div><p className="border-t pt-4 text-muted-foreground">Need an account adjustment? Contact the bank team from Support.</p></CardContent></Card>
            </div><MemberFinancialControls mode="operations" recipients={recipients} email={user.email} /></div>
        )}

        {activeView === "transfers" && <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><Card className="glass-panel border-0 bg-white/80"><CardHeader><CardTitle>Internal transfers</CardTitle><CardDescription>Find a registered member by email or account number.</CardDescription></CardHeader><CardContent><Button onClick={() => setSendOpen(true)} className="rounded-full bg-[#10251f] text-white hover:bg-[#163b35]"><Send className="mr-2 h-4 w-4" />Start a transfer</Button><p className="mt-4 text-sm text-muted-foreground">Recent recipients are suggested as you type. You can save any recipient to your contacts.</p></CardContent></Card><Card className="glass-panel border-0 bg-white/80"><CardHeader><CardTitle>Transfer policy</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Verify the member and account number before sending.</p><p>Available balance is checked again when the transfer is posted.</p><p>For a reversal or investigation, contact BitNobe Support.</p></CardContent></Card></div>}
        {activeView === "activity" && <Card className="glass-panel border-0 bg-white/80"><CardHeader><CardTitle>Account activity</CardTitle><CardDescription>A complete view of your latest 50 posted transactions.</CardDescription></CardHeader><CardContent><TransactionsList transactions={transactions} currentUserId={user.id} /></CardContent></Card>}
        {activeView === "support" && <div className="grid gap-4 md:grid-cols-2"><Card className="glass-panel border-0 bg-white/80"><CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Contact BitNobe</CardTitle><CardDescription>Get help from the bank team.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm"><p>For account adjustments, transfer investigations, or access issues, contact your internal BitNobe administrator.</p><Link href="/support"><Button variant="outline" className="rounded-full"><FileText className="mr-2 h-4 w-4" />Open a support request</Button></Link></CardContent></Card><Card className="glass-panel border-0 bg-white/80"><CardHeader><CardTitle>Account controls</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Keep your sign-in credentials private.</p><p>Verify the recipient before sending funds.</p><p>BitNobe will never ask you to add balance through this workspace.</p></CardContent></Card></div>}
      </main>
      <SendMoneyDialog open={sendOpen} onOpenChange={setSendOpen} recipients={recipients} balance={account.balance} />
    </div>
  )
}