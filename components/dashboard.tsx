"use client"

import { useState } from "react"
import { Plus, Send, Copy, Check, ArrowUpRight, Wallet } from "lucide-react"

import { formatCents, maskAccount } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TopNav } from "@/components/top-nav"
import { TransactionsList, type Transaction } from "@/components/transactions-list"
import { DepositDialog } from "@/components/deposit-dialog"
import { SendMoneyDialog, type Recipient } from "@/components/send-money-dialog"

type Summary = {
  user: { id: string; name: string; email: string }
  account: { accountNumber: string; routingNumber: string; balance: number }
  transactions: Transaction[]
}

export function Dashboard({ summary, recipients }: { summary: Summary; recipients: Recipient[] }) {
  const [depositOpen, setDepositOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const { user, account, transactions } = summary

  const sentThisMonth = transactions.filter(
    (t) => t.fromUserId === user.id && new Date(t.createdAt).getMonth() === new Date().getMonth(),
  ).length

  async function copyAccount() {
    await navigator.clipboard.writeText(account.accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav name={user.name} email={user.email} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back, {user.name.split(" ")[0]}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setDepositOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add money
            </Button>
            <Button onClick={() => setSendOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Send money
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Balance card */}
          <Card className="lg:col-span-2 overflow-hidden border-0 bg-primary text-primary-foreground shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Wallet className="h-4 w-4" />
                Available balance
              </div>
              <p className="mt-2 font-mono text-4xl font-semibold tracking-tight sm:text-5xl">
                {formatCents(account.balance)}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
                <div>
                  <p className="text-primary-foreground/70">Account number</p>
                  <button
                    onClick={copyAccount}
                    className="mt-0.5 flex items-center gap-1.5 font-mono font-medium hover:opacity-90"
                  >
                    {maskAccount(account.accountNumber)}
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div>
                  <p className="text-primary-foreground/70">Routing number</p>
                  <p className="mt-0.5 font-mono font-medium">{account.routingNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Members you can pay</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{recipients.length}</p>
                <p className="text-xs text-muted-foreground">registered accounts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Transfers this month</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{sentThisMonth}</p>
                <p className="text-xs text-muted-foreground">sent by you</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transactions */}
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="grid gap-1">
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Your latest deposits and transfers.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSendOpen(true)}>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              New transfer
            </Button>
          </CardHeader>
          <CardContent>
            <TransactionsList transactions={transactions} currentUserId={user.id} />
          </CardContent>
        </Card>
      </main>

      <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
      <SendMoneyDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        recipients={recipients}
        balance={account.balance}
      />
    </div>
  )
}
