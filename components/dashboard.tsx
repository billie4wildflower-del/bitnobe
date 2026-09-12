"use client"

import { useState } from "react"
import { Banknote, CheckCircle2, Copy, FileText, HelpCircle, LockKeyhole, Send, ShieldCheck, WalletCards } from "lucide-react"

import { formatCents, maskAccount } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TopNav, type WorkspaceView } from "@/components/top-nav"
import { TransactionsList, type Transaction } from "@/components/transactions-list"
import { SendMoneyDialog, type Recipient } from "@/components/send-money-dialog"

type Summary = {
  user: { id: string; name: string; email: string }
  account: { accountNumber: string; routingNumber: string; balance: number }
  transactions: Transaction[]
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
    <div className="min-h-screen bg-background">
      <TopNav name={user.name} email={user.email} activeView={activeView} onViewChange={setActiveView} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-sm text-muted-foreground">Member workspace</p><h1 className="text-3xl font-semibold tracking-tight capitalize">{activeView}</h1></div>
          {activeView !== "support" && <Button onClick={openTransfers}><Send className="mr-2 h-4 w-4" />New transfer</Button>}
        </div>
        <div className="mb-6 flex gap-1 overflow-x-auto border-b md:hidden">
          {(["overview", "accounts", "transfers", "activity", "support"] as WorkspaceView[]).map((view) => <button key={view} type="button" onClick={() => setActiveView(view)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm capitalize ${activeView === view ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{view}</button>)}
        </div>

        {activeView === "overview" && <div className="grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden border-0 bg-primary text-primary-foreground shadow-sm lg:col-span-2"><CardContent className="p-6"><div className="flex items-center gap-2 text-sm text-primary-foreground/80"><WalletCards className="h-4 w-4" />Available balance</div><p className="mt-2 font-mono text-4xl font-semibold tracking-tight sm:text-5xl">{formatCents(account.balance)}</p><div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm"><div><p className="text-primary-foreground/70">Account number</p><button onClick={() => copyAccount(account.accountNumber)} className="mt-0.5 flex items-center gap-1.5 font-mono font-medium">{maskAccount(account.accountNumber)}<Copy className="h-3.5 w-3.5" /></button></div><div><p className="text-primary-foreground/70">Routing number</p><p className="mt-0.5 font-mono font-medium">{account.routingNumber}</p></div></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Account standing</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="font-medium">Active</p><p className="text-xs text-muted-foreground">No restrictions</p></div></div><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600" /><div><p className="font-medium">Protected</p><p className="text-xs text-muted-foreground">BitNobe monitored</p></div></div></CardContent></Card>
          <Card className="lg:col-span-3"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Recent activity</CardTitle><CardDescription>Transfers and bank-posted account activity.</CardDescription></div><Button variant="outline" size="sm" onClick={() => setActiveView("activity")}>View all</Button></CardHeader><CardContent><TransactionsList transactions={transactions.slice(0, 5)} currentUserId={user.id} /></CardContent></Card>
        </div>}

        {activeView === "accounts" && <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" />BitNobe checking</CardTitle><CardDescription>Primary member account</CardDescription></CardHeader><CardContent className="space-y-5"><div><p className="text-sm text-muted-foreground">Available balance</p><p className="mt-1 text-3xl font-semibold">{formatCents(account.balance)}</p></div><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-muted-foreground">Account number</p><button onClick={() => copyAccount(account.accountNumber)} className="mt-1 font-mono">{maskAccount(account.accountNumber)} {copied ? "Copied" : "Copy"}</button></div><div><p className="text-muted-foreground">Routing number</p><p className="mt-1 font-mono">{account.routingNumber}</p></div></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Funding and security</CardTitle><CardDescription>How your account is managed</CardDescription></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex gap-3"><LockKeyhole className="h-5 w-5 shrink-0 text-primary" /><p>Balances can only be posted by authorized BitNobe bank operations.</p></div><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><p>Every internal transfer is recorded and processed atomically.</p></div><p className="border-t pt-4 text-muted-foreground">Need an account adjustment? Contact the bank team from Support.</p></CardContent></Card>
        </div>}

        {activeView === "transfers" && <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><Card><CardHeader><CardTitle>Internal transfers</CardTitle><CardDescription>Send funds to another verified BitNobe member.</CardDescription></CardHeader><CardContent><Button onClick={() => setSendOpen(true)}><Send className="mr-2 h-4 w-4" />Start a transfer</Button><p className="mt-4 text-sm text-muted-foreground">Transfers are posted immediately between BitNobe member accounts. Review the recipient and amount before confirming.</p></CardContent></Card><Card><CardHeader><CardTitle>Transfer policy</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Only registered members are eligible recipients.</p><p>Available balance is checked again when the transfer is posted.</p><p>For a reversal or investigation, contact BitNobe Support.</p></CardContent></Card></div>}
        {activeView === "activity" && <Card><CardHeader><CardTitle>Account activity</CardTitle><CardDescription>A complete view of your latest 50 posted transactions.</CardDescription></CardHeader><CardContent><TransactionsList transactions={transactions} currentUserId={user.id} /></CardContent></Card>}
        {activeView === "support" && <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Contact BitNobe</CardTitle><CardDescription>Get help from the bank team.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm"><p>For account adjustments, transfer investigations, or access issues, contact your internal BitNobe administrator.</p><Button variant="outline"><FileText className="mr-2 h-4 w-4" />Open a support request</Button></CardContent></Card><Card><CardHeader><CardTitle>Account controls</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Keep your sign-in credentials private.</p><p>Verify the recipient before sending funds.</p><p>BitNobe will never ask you to add balance through this workspace.</p></CardContent></Card></div>}
      </main>
      <SendMoneyDialog open={sendOpen} onOpenChange={setSendOpen} recipients={recipients} balance={account.balance} />
    </div>
  )
}