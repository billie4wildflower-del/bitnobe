"use client"

import { FormEvent, useEffect, useState, useTransition } from "react"
import { CheckCircle2, CreditCard, Landmark, Plus, ShieldCheck, Trash2, Wifi } from "lucide-react"

import { addTransferContact, applyForCard, getCardApplications, getWireTransfers, removeTransferContact, requestWireTransfer, type CardApplication, type CreditApplicationInput, type WireTransfer } from "@/app/actions/bank"
import { formatCents, parseDollarsToCents, maskAccount } from "@/lib/format"
import type { Recipient } from "@/components/send-money-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function statusLabel(application?: CardApplication) {
  if (!application) return "Available to apply"
  if (application.status === "approved") return "Approved"
  if (application.status === "declined") return "Not approved"
  return application.cardType === "credit" && application.backgroundCheckStatus !== "passed"
    ? `Reviewing · ${application.backgroundCheckStatus}`
    : "Application pending"
}

function BankCard({ type, application, onApply, onSelect, selected, accountBalance = 0, pending }: { type: "debit" | "credit"; application?: CardApplication; onApply: () => void; onSelect: () => void; selected: boolean; accountBalance?: number; pending: boolean }) {
  const isCredit = type === "credit"
  return <div className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow ${selected ? "ring-2 ring-primary/40" : ""}`}>
    <div className={`relative mx-4 mt-4 aspect-[1.586] overflow-hidden rounded-xl p-5 text-white shadow-lg ${isCredit ? "bg-[linear-gradient(135deg,#9b1735_0%,#d33b3f_52%,#f29a52_100%)]" : "bg-[linear-gradient(135deg,#123c3a_0%,#176b61_54%,#5d9b78_100%)]"}`}>
      <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full border border-white/20" />
      <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full border border-white/15" />
      <div className="relative flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">BitNobe</p><p className="mt-1 text-xs font-medium text-white/85">{isCredit ? "Everyday rewards" : "Member debit"}</p></div><Wifi className="h-5 w-5 rotate-90 text-white/80" /></div>
      <div className="relative mt-7 h-8 w-11 rounded-md bg-[#e8c57d] shadow-inner sm:mt-10" />
      <div className="relative mt-3 flex items-end justify-between"><div><p className="font-mono text-sm tracking-[0.2em] text-white/90">••••  ••••  ••••  4826</p><p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-white/65">{isCredit ? "Credit line" : "Checking account"}</p></div><p className="text-xl font-black italic tracking-tight text-white/90">{isCredit ? "VISA" : "debit"}</p></div>
    </div>
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{isCredit ? "BitNobe Rewards Visa" : "BitNobe Member Debit"}</p><p className="mt-1 text-xs text-muted-foreground">{isCredit ? "Earn rewards on everyday purchases." : "Spend directly from your BitNobe checking account."}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${application?.status === "approved" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{statusLabel(application)}</span></div>
      <div className="grid grid-cols-2 gap-2 border-y py-3 text-xs"><div><p className="text-muted-foreground">{isCredit ? "Credit limit" : "Current balance"}</p><p className="mt-1 font-medium">{isCredit ? (application?.creditLimit ? formatCents(application.creditLimit) : "Set after approval") : formatCents(accountBalance)}</p></div><div><p className="text-muted-foreground">{isCredit ? "Available credit" : "Access"}</p><p className="mt-1 font-medium">{isCredit ? (application?.creditLimit ? formatCents(application.availableCredit) : "Pending review") : "Free ATM access"}</p></div></div>
      <div className="grid gap-2 sm:grid-cols-2"><Button type="button" variant="ghost" onClick={onSelect}>View details</Button><Button className="w-full" variant={isCredit ? "default" : "outline"} onClick={onApply} disabled={pending || (!!application && application.status !== "declined")}><CreditCard className="mr-2 h-4 w-4" />{application?.status === "approved" ? "Card approved" : application?.status === "pending" ? "Application submitted" : isCredit ? "Apply for this card" : "Enroll this debit card"}</Button></div>
    </div>
  </div>
}

function CreditApplicationForm({ email, onSubmit, onCancel, pending }: { email: string; onSubmit: (input: CreditApplicationInput) => void; onCancel: () => void; pending: boolean }) {
  const [form, setForm] = useState<CreditApplicationInput>({ legalName: "", dateOfBirth: "", residentialAddress: "", phone: "", citizenshipStatus: "us_citizen", identificationType: "ssn", identificationLast4: "", employmentStatus: "employed", employerName: "", employerPhone: "", annualIncomeCents: 0, monthlyHousingPaymentCents: 0, bankAccountType: "" })
  const update = <K extends keyof CreditApplicationInput>(key: K, value: CreditApplicationInput[K]) => setForm((current) => ({ ...current, [key]: value }))
  return <Card className="border-[#9b1735]/30 bg-white"><CardHeader><CardTitle>Apply for BitNobe Rewards Visa</CardTitle><CardDescription>Complete the secure application. Never enter a full SSN, ITIN, or bank password here.</CardDescription></CardHeader><CardContent><form onSubmit={(event) => { event.preventDefault(); onSubmit(form) }} className="grid gap-3 sm:grid-cols-2"><Input value={form.legalName} onChange={(event) => update("legalName", event.target.value)} placeholder="Full legal name" aria-label="Full legal name" required /><Input value={email} readOnly aria-label="Email address" className="bg-muted" /><Input type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} aria-label="Date of birth" required /><Input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Phone number" aria-label="Phone number" inputMode="tel" required /><Input className="sm:col-span-2" value={form.residentialAddress} onChange={(event) => update("residentialAddress", event.target.value)} placeholder="Physical residential address" aria-label="Residential address" required /><select value={form.citizenshipStatus} onChange={(event) => update("citizenshipStatus", event.target.value as CreditApplicationInput["citizenshipStatus"])} aria-label="Citizenship or residency status" className="h-9 rounded-lg border border-input bg-background px-2 text-sm"><option value="us_citizen">U.S. citizen</option><option value="permanent_resident">Permanent resident</option><option value="other">Other residency status</option></select><select value={form.identificationType} onChange={(event) => update("identificationType", event.target.value as CreditApplicationInput["identificationType"])} aria-label="Identification type" className="h-9 rounded-lg border border-input bg-background px-2 text-sm"><option value="ssn">SSN</option><option value="itin">ITIN</option></select><Input value={form.identificationLast4} onChange={(event) => update("identificationLast4", event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="SSN/ITIN last four" aria-label="SSN or ITIN last four digits" inputMode="numeric" maxLength={4} required /><select value={form.employmentStatus} onChange={(event) => update("employmentStatus", event.target.value as CreditApplicationInput["employmentStatus"])} aria-label="Employment status" className="h-9 rounded-lg border border-input bg-background px-2 text-sm"><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="retired">Retired</option><option value="unemployed">Unemployed</option></select><Input value={form.employerName} onChange={(event) => update("employerName", event.target.value)} placeholder="Employer name (optional)" aria-label="Employer name" /><Input value={form.employerPhone} onChange={(event) => update("employerPhone", event.target.value)} placeholder="Employer phone (optional)" aria-label="Employer phone" inputMode="tel" /><Input type="number" min="0" step="0.01" placeholder="Gross annual income" aria-label="Gross annual income" onChange={(event) => update("annualIncomeCents", Math.round(Number(event.target.value || 0) * 100))} required /><Input type="number" min="0" step="0.01" placeholder="Monthly rent or mortgage" aria-label="Monthly housing payment" onChange={(event) => update("monthlyHousingPaymentCents", Math.round(Number(event.target.value || 0) * 100))} required /><select value={form.bankAccountType} onChange={(event) => update("bankAccountType", event.target.value as CreditApplicationInput["bankAccountType"])} aria-label="Bank account type" className="h-9 rounded-lg border border-input bg-background px-2 text-sm"><option value="">No linked bank account</option><option value="checking">Checking account</option><option value="savings">Savings account</option></select><div className="flex gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending}>Submit credit application</Button></div></form></CardContent></Card>
}

export function MemberFinancialControls({ mode = "all", recipients, email, accountBalance = 0 }: { mode?: "all" | "cards" | "operations"; recipients: Recipient[]; email: string; accountBalance?: number }) {
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
  const [creditFormOpen, setCreditFormOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<"debit" | "credit">("debit")

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
    {mode !== "operations" && <>
      <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Cards and payment access</CardTitle><CardDescription>Select a card to review its balance and application status.</CardDescription></CardHeader><CardContent className="grid gap-4 p-4 lg:grid-cols-2"><BankCard type="debit" application={applications.find((application) => application.cardType === "debit")} accountBalance={accountBalance} selected={selectedCard === "debit"} onSelect={() => setSelectedCard("debit")} onApply={() => run(() => applyForCard("debit"), "Debit card application submitted.")} pending={pending} /><BankCard type="credit" application={applications.find((application) => application.cardType === "credit")} selected={selectedCard === "credit"} onSelect={() => setSelectedCard("credit")} onApply={() => setCreditFormOpen(true)} pending={pending} /></CardContent></Card>
      {creditFormOpen && <CreditApplicationForm email={email} onCancel={() => setCreditFormOpen(false)} onSubmit={(input) => run(() => applyForCard("credit", input), "Credit application submitted for background review.")} pending={pending} />}
      <Card><CardHeader><CardTitle>{selectedCard === "credit" ? "Credit card account" : "Debit card account"}</CardTitle><CardDescription>{selectedCard === "credit" ? "Your approved credit line and remaining spending capacity." : "Your debit card draws directly from your BitNobe checking balance."}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{selectedCard === "credit" ? "Credit limit" : "Daily access"}</p><p className="mt-1 text-lg font-semibold">{selectedCard === "credit" ? formatCents(applications.find((application) => application.cardType === "credit")?.creditLimit ?? 0) : "Based on balance"}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Current balance</p><p className="mt-1 text-lg font-semibold">{selectedCard === "credit" ? formatCents(applications.find((application) => application.cardType === "credit")?.currentBalance ?? 0) : formatCents(accountBalance)}</p></div><div className="rounded-lg bg-primary/10 p-3"><p className="text-xs text-muted-foreground">Available to spend</p><p className="mt-1 text-lg font-semibold text-primary">{selectedCard === "credit" ? formatCents(applications.find((application) => application.cardType === "credit")?.availableCredit ?? 0) : formatCents(accountBalance)}</p></div></CardContent></Card>
      <div className="grid gap-3 sm:grid-cols-3"><div className="flex gap-3 rounded-xl border bg-card p-4"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-medium">Fraud monitoring</p><p className="mt-1 text-xs text-muted-foreground">Every purchase is monitored for unusual activity.</p></div></div><div className="flex gap-3 rounded-xl border bg-card p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-sm font-medium">No hidden fees</p><p className="mt-1 text-xs text-muted-foreground">Clear pricing before you submit an application.</p></div></div><div className="flex gap-3 rounded-xl border bg-card p-4"><Landmark className="h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-medium">Member support</p><p className="mt-1 text-xs text-muted-foreground">Our operations team reviews credit applications.</p></div></div></div>
    </>}
    {mode !== "cards" && <>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Wire withdrawal</CardTitle><CardDescription>Send funds to an external bank account. Requests are reviewed by operations.</CardDescription></CardHeader><CardContent><form onSubmit={submitWire} className="grid gap-3 sm:grid-cols-2"><Input value={beneficiaryName} onChange={(event) => setBeneficiaryName(event.target.value)} placeholder="Beneficiary name" aria-label="Beneficiary name" required /><Input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Bank name" aria-label="Bank name" required /><Input value={routingNumber} onChange={(event) => setRoutingNumber(event.target.value)} placeholder="Routing number" aria-label="Routing number" inputMode="numeric" required /><Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account number" aria-label="External account number" inputMode="numeric" required /><Input value={wireAmount} onChange={(event) => setWireAmount(event.target.value)} placeholder="Amount in USD" aria-label="Wire amount" inputMode="decimal" required /><Button type="submit" disabled={pending}>Request wire</Button></form><div className="mt-4 space-y-2">{wires.map((wire) => <div key={wire.id} className="flex items-center justify-between border-t pt-2 text-sm"><span>{wire.beneficiaryName} · {formatCents(wire.amount)}</span><span className="capitalize text-muted-foreground">{wire.status}</span></div>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Transfer contacts</CardTitle><CardDescription>Save members by email or account number for faster transfers.</CardDescription></CardHeader><CardContent><form onSubmit={submitContact} className="flex flex-col gap-2 sm:flex-row"><Input value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="Email or account number" aria-label="Member email or account number" required /><Button type="submit" disabled={pending}><Plus className="mr-2 h-4 w-4" />Add member</Button></form><div className="mt-4 grid gap-2 sm:grid-cols-2">{recipients.filter((recipient) => recipient.isContact).map((recipient) => <div key={recipient.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span>{recipient.name}<span className="ml-2 text-xs text-muted-foreground">{maskAccount(recipient.accountNumber)}</span></span><Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove ${recipient.name}`} onClick={() => run(() => removeTransferContact(recipient.id), "Transfer contact removed.")}><Trash2 className="h-4 w-4" /></Button></div>)}{recipients.filter((recipient) => recipient.isContact).length === 0 && <p className="text-sm text-muted-foreground">No saved contacts yet.</p>}</div></CardContent></Card>
    </>}
    {notice && <p className="text-sm text-emerald-600">{notice}</p>}{error && <p className="text-sm text-destructive">{error}</p>}
  </div>
}
