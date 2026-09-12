"use client"

import { FormEvent, useEffect, useState, useTransition } from "react"
import { CreditCard, Landmark, Plus, Trash2, WalletCards } from "lucide-react"

import { addTransferContact, applyForCard, getCardApplications, getWireTransfers, removeTransferContact, requestWireTransfer, type CardApplication, type WireTransfer } from "@/app/actions/bank"
import { formatCents, parseDollarsToCents, maskAccount } from "@/lib/format"
import type { Recipient } from "@/components/send-money-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function MemberFinancialControls({ recipients }: { recipients: Recipient[] }) {
  const [applications, setApplications] = useState<CardApplication[]>([])
  const [wires, setWires] = useState<WireTransfer[]>([])
  const [contactEmail, setContactEmail] = useState("")
  const [beneficiaryName, setBeneficiaryName] = useState("")
  const [bankName, setBankName] = useState("")
  const [routingNumber, setRoutingNumber] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [wireAmount, setWireAmount] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function refresh() {
    const [nextApplications, nextWires] = await Promise.all([getCardApplications(), getWireTransfers()])
    setApplications(nextApplications)
    setWires(nextWires)
  }

  useEffect(() => { void refresh() }, [])

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) { setError(result.error); return }
      setNotice(success)
      await refresh()
    })
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    run(() => addTransferContact(contactEmail), "Member added to your transfer contacts.")
    setContactEmail("")
  }

  function submitWire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amountCents = parseDollarsToCents(wireAmount)
    if (amountCents === null) { setError("Enter a valid withdrawal amount."); return }
    run(() => requestWireTransfer({ amountCents, beneficiaryName, bankName, routingNumber, accountNumber }), "Wire withdrawal requested and funds reserved.")
    setWireAmount("")
  }

  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" />Card enrollment</CardTitle><CardDescription>Apply for debit access or a credit card review.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={() => run(() => applyForCard("debit"), "Debit card application submitted.")} disabled={pending}><CreditCard className="mr-2 h-4 w-4" />Enroll debit card</Button><Button onClick={() => run(() => applyForCard("credit"), "Credit application submitted for background review.")} disabled={pending}><CreditCard className="mr-2 h-4 w-4" />Apply for credit</Button></div><p className="text-xs text-muted-foreground">Credit applications remain pending until identity and background screening are completed by bank operations.</p>{applications.map((application) => <div key={application.id} className="flex items-center justify-between border-t pt-3 text-sm"><span className="capitalize">{application.cardType} card</span><span className={`font-medium ${application.status === "approved" ? "text-emerald-600" : application.status === "declined" ? "text-destructive" : "text-muted-foreground"}`}>{application.status}{application.cardType === "credit" && application.backgroundCheckStatus !== "passed" ? ` · check ${application.backgroundCheckStatus}` : ""}</span></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Wire withdrawal</CardTitle><CardDescription>Send funds to an external bank account. Requests are reviewed by operations.</CardDescription></CardHeader><CardContent><form onSubmit={submitWire} className="grid gap-3 sm:grid-cols-2"><Input value={beneficiaryName} onChange={(event) => setBeneficiaryName(event.target.value)} placeholder="Beneficiary name" aria-label="Beneficiary name" required /><Input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Bank name" aria-label="Bank name" required /><Input value={routingNumber} onChange={(event) => setRoutingNumber(event.target.value)} placeholder="Routing number" aria-label="Routing number" inputMode="numeric" required /><Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account number" aria-label="External account number" inputMode="numeric" required /><Input value={wireAmount} onChange={(event) => setWireAmount(event.target.value)} placeholder="Amount in USD" aria-label="Wire amount" inputMode="decimal" required /><Button type="submit" disabled={pending}>Request wire</Button></form><div className="mt-4 space-y-2">{wires.map((wire) => <div key={wire.id} className="flex items-center justify-between border-t pt-2 text-sm"><span>{wire.beneficiaryName} · {formatCents(wire.amount)}</span><span className="capitalize text-muted-foreground">{wire.status}</span></div>)}</div></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Transfer contacts</CardTitle><CardDescription>Only members you add here appear in your transfer recipient list.</CardDescription></CardHeader><CardContent><form onSubmit={submitContact} className="flex gap-2"><Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Member email address" aria-label="Member email address" type="email" required /><Button type="submit" disabled={pending}><Plus className="mr-2 h-4 w-4" />Add member</Button></form><div className="mt-4 grid gap-2 sm:grid-cols-2">{recipients.map((recipient) => <div key={recipient.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span>{recipient.name}<span className="ml-2 text-xs text-muted-foreground">{maskAccount(recipient.accountNumber)}</span></span><Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove ${recipient.name}`} onClick={() => run(() => removeTransferContact(recipient.id), "Transfer contact removed.")}><Trash2 className="h-4 w-4" /></Button></div>)}{recipients.length === 0 && <p className="text-sm text-muted-foreground">No transfer contacts yet.</p>}</div></CardContent></Card>
    {notice && <p className="text-sm text-emerald-600">{notice}</p>}{error && <p className="text-sm text-destructive">{error}</p>}
  </div>
}
