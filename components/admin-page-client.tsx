"use client"

import { FormEvent, useEffect, useState, useTransition } from "react"
import { Banknote, CheckCircle2, FileClock, LockKeyhole, MessageCircle, Search, Send, ShieldAlert, ShieldCheck, UnlockKeyhole, UserCog } from "lucide-react"

import { getAdminAuditLog, getAdminCardApplications, getAdminConversation, getAdminDashboard, getAdminUserProfile, getAdminUserSessions, getAdminUserTransactions, postBankCredit, postBankDebit, requestAdminCredentialReset, reverseAdminTransaction, reviewCardApplication, revokeUserSessions, sendAdminSupportMessage, terminateAdminSession, updateAdminUserProfile, updateAdminUserControl, type AdminAuditEntry, type AdminCardApplication, type AdminSession, type AdminTransaction, type AdminUser, type AdminUserProfile, type SupportMessage } from "@/app/actions/bank"
import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/format"

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

function AdminMemberOperations({ user }: { user: AdminUser }) {
  const [profile, setProfile] = useState<AdminUserProfile | null>(null)
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [profileNotice, setProfileNotice] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [transactionNote, setTransactionNote] = useState("")
  const [pending, startTransition] = useTransition()

  async function refresh() {
    const [nextProfile, nextSessions, nextTransactions] = await Promise.all([getAdminUserProfile(user.id), getAdminUserSessions(user.id), getAdminUserTransactions(user.id)])
    setProfile(nextProfile)
    setSessions(nextSessions)
    setTransactions(nextTransactions)
  }

  useEffect(() => { void refresh() }, [user.id])

  if (!profile) return <Card><CardContent className="p-4 text-sm text-muted-foreground">Loading member operations...</CardContent></Card>

  function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setProfileError(null)
    setProfileNotice(null)
    startTransition(async () => {
      const result = await updateAdminUserProfile(profile)
      if (!result.ok) { setProfileError(result.error); return }
      setProfileNotice("Member profile saved and audit recorded.")
    })
  }

  function resetCredentials() {
    setProfileError(null)
    startTransition(async () => {
      const result = await requestAdminCredentialReset(user.id)
      if (!result.ok) { setProfileError(result.error); return }
      setProfileNotice("Credential reset requested and active sessions revoked.")
      setSessions(await getAdminUserSessions(user.id))
    })
  }

  function reverseTransaction(transactionId: number) {
    setProfileError(null)
    startTransition(async () => {
      const result = await reverseAdminTransaction(transactionId, transactionNote)
      if (!result.ok) { setProfileError(result.error); return }
      setTransactionNote("")
      setProfileNotice("Transaction reversed and audit recorded.")
      setTransactions(await getAdminUserTransactions(user.id))
    })
  }

  return <div className="space-y-4">
    <Card><CardHeader><CardTitle>Identity, contact, and KYC profile</CardTitle><CardDescription>Restricted operational metadata. Tax ID is stored as last four only.</CardDescription></CardHeader><CardContent><form onSubmit={updateProfile} className="grid gap-3 sm:grid-cols-2"><Input value={profile.legalName} onChange={(event) => setProfile({ ...profile, legalName: event.target.value })} placeholder="Full legal name" aria-label="Full legal name" disabled={pending} /><Input type="date" value={profile.dateOfBirth ?? ""} onChange={(event) => setProfile({ ...profile, dateOfBirth: event.target.value })} aria-label="Date of birth" disabled={pending} /><Input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Primary phone" aria-label="Primary phone" disabled={pending} /><Input value={profile.taxIdLast4} onChange={(event) => setProfile({ ...profile, taxIdLast4: event.target.value.slice(-4) })} placeholder="Tax ID last 4" aria-label="Tax ID last four digits" inputMode="numeric" maxLength={4} disabled={pending} /><Input value={profile.residentialAddress} onChange={(event) => setProfile({ ...profile, residentialAddress: event.target.value })} placeholder="Residential address" aria-label="Residential address" disabled={pending} /><Input value={profile.mailingAddress} onChange={(event) => setProfile({ ...profile, mailingAddress: event.target.value })} placeholder="Mailing address" aria-label="Mailing address" disabled={pending} /><Input value={profile.employmentProfile} onChange={(event) => setProfile({ ...profile, employmentProfile: event.target.value })} placeholder="Employment profile" aria-label="Employment profile" disabled={pending} /><select value={profile.kycStatus} onChange={(event) => setProfile({ ...profile, kycStatus: event.target.value as AdminUserProfile["kycStatus"] })} aria-label="KYC status" disabled={pending} className="h-9 rounded-lg border border-input bg-background px-2 text-sm"><option value="not_started">KYC not started</option><option value="pending">KYC pending</option><option value="verified">KYC verified</option><option value="rejected">KYC rejected</option></select><Input className="sm:col-span-2" value={profile.kycDocumentNote} onChange={(event) => setProfile({ ...profile, kycDocumentNote: event.target.value })} placeholder="KYC document review note or secure document reference" aria-label="KYC document note" disabled={pending} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.alertOptIn} onChange={(event) => setProfile({ ...profile, alertOptIn: event.target.checked })} />Transaction alerts enabled</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={profile.marketingOptIn} onChange={(event) => setProfile({ ...profile, marketingOptIn: event.target.checked })} />Marketing communications enabled</label><Button type="submit" className="sm:col-span-2" disabled={pending}>Save member profile</Button></form>{profileNotice && <p className="mt-3 text-sm text-emerald-600">{profileNotice}</p>}{profileError && <p className="mt-3 text-sm text-destructive">{profileError}</p>}</CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Security and sessions</CardTitle><CardDescription>Reset credentials and terminate individual devices.</CardDescription></CardHeader><CardContent className="space-y-3"><Button variant="outline" onClick={resetCredentials} disabled={pending}><LockKeyhole className="mr-2 h-4 w-4" />Require password reset</Button>{sessions.length === 0 ? <p className="text-sm text-muted-foreground">No active sessions.</p> : sessions.map((session) => <div key={session.id} className="flex items-center justify-between gap-3 border-t pt-2 text-xs"><span className="min-w-0"><span className="block truncate">{session.userAgent ?? "Unknown device"}</span><span className="text-muted-foreground">{session.ipAddress ?? "Unknown IP"} · {formatDateTime(session.createdAt)}</span></span><Button size="sm" variant="ghost" onClick={() => startTransition(async () => { await terminateAdminSession(session.id); setSessions(await getAdminUserSessions(user.id)) })} disabled={pending}>Terminate</Button></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Transaction review</CardTitle><CardDescription>Review recent activity and reverse accidental postings.</CardDescription></CardHeader><CardContent className="space-y-3"><Input value={transactionNote} onChange={(event) => setTransactionNote(event.target.value)} placeholder="Reversal reason" aria-label="Reversal reason" disabled={pending} />{transactions.length === 0 ? <p className="text-sm text-muted-foreground">No transactions for this member.</p> : transactions.slice(0, 8).map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 border-t pt-2 text-xs"><span><span className="block font-medium">#{transaction.id} · ${(transaction.amount / 100).toFixed(2)}</span><span className="text-muted-foreground">{transaction.fromName} to {transaction.toName}</span></span>{transaction.action === "reversed" ? <span className="text-muted-foreground">Reversed</span> : <Button size="sm" variant="ghost" onClick={() => reverseTransaction(transaction.id)} disabled={pending || !transactionNote.trim()}>Reverse</Button>}</div>)}</CardContent></Card></div>
  </div>
}

export function AdminPageClient({ name, email, role, initialUsers }: { name: string; email: string; role: "support" | "manager" | "engineering"; initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [selectedId, setSelectedId] = useState(initialUsers[0]?.id ?? "")
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [reply, setReply] = useState("")
  const [credit, setCredit] = useState("")
  const [debit, setDebit] = useState("")
  const [note, setNote] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | AdminUser["status"]>("all")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [cardApplications, setCardApplications] = useState<AdminCardApplication[]>([])
  const [backgroundChecks, setBackgroundChecks] = useState<Record<number, "passed" | "failed">>({})
  const [creditLimits, setCreditLimits] = useState<Record<number, string>>({})
  const [auditEntries, setAuditEntries] = useState<AdminAuditEntry[]>([])
  const [riskScore, setRiskScore] = useState("0")
  const [fraudFreeze, setFraudFreeze] = useState(false)
  const selectedUser = users.find((user) => user.id === selectedId)
  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase()
    const matchesQuery = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query) || user.accountNumber?.includes(query)
    return matchesQuery && (statusFilter === "all" || user.status === statusFilter)
  })

  useEffect(() => {
    if (selectedUser) {
      setAdminNote(selectedUser.adminNote)
      setRiskScore(String(selectedUser.riskScore))
      setFraudFreeze(selectedUser.fraudFreeze)
    }
  }, [selectedId, selectedUser])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    const load = async () => {
      const latest = await getAdminConversation(selectedId)
      if (active) setMessages(latest)
    }
    void load()
    const interval = window.setInterval(() => void load(), 5000)
    return () => { active = false; window.clearInterval(interval) }
  }, [selectedId])

  useEffect(() => {
    void getAdminCardApplications().then(setCardApplications)
    void getAdminAuditLog().then(setAuditEntries)
  }, [])

  function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await sendAdminSupportMessage(selectedId, reply)
      if (!result.ok) { setError(result.error); return }
      setMessages((current) => [...current, result.message])
      setReply("")
      setUsers((current) => current.map((user) => user.id === selectedId ? { ...user, lastMessageAt: result.message.createdAt, unreadMessages: 0 } : user))
    })
  }

  function submitCredit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    const amountCents = Math.round(Number(credit) * 100)
    startTransition(async () => {
      const result = await postBankCredit(selectedId, amountCents, note)
      if (!result.ok) { setError(result.error); return }
      setNotice("Credit posted successfully.")
      setCredit("")
      setNote("")
      const refreshed = await getAdminDashboard()
      setUsers(refreshed)
    })
  }

  function submitDebit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    const amountCents = Math.round(Number(debit) * 100)
    startTransition(async () => {
      const result = await postBankDebit(selectedId, amountCents, note)
      if (!result.ok) { setError(result.error); return }
      setNotice("Debit posted successfully.")
      setDebit("")
      setNote("")
      setUsers(await getAdminDashboard())
    })
  }

  function saveUserControl(status: AdminUser["status"]) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await updateAdminUserControl({ userId: selectedId, status, adminNote, riskScore: Number(riskScore), fraudFreeze })
      if (!result.ok) { setError(result.error); return }
      setNotice(status === "active" ? "Member access restored." : `Member status set to ${status}.`)
      setUsers(await getAdminDashboard())
      setAuditEntries(await getAdminAuditLog(selectedId))
    })
  }

  function saveAdminNote() {
    if (!selectedUser) return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await updateAdminUserControl({ userId: selectedId, status: selectedUser.status, adminNote, riskScore: Number(riskScore), fraudFreeze })
      if (!result.ok) { setError(result.error); return }
      setNotice("Internal note saved.")
      setUsers(await getAdminDashboard())
      setAuditEntries(await getAdminAuditLog(selectedId))
    })
  }

  function revokeSessions() {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await revokeUserSessions(selectedId)
      if (!result.ok) { setError(result.error); return }
      setNotice("All member sessions were revoked.")
      setUsers(await getAdminDashboard())
      setAuditEntries(await getAdminAuditLog(selectedId))
    })
  }

  function reviewCard(applicationId: number, decision: "approve" | "decline", backgroundCheck: "passed" | "failed") {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await reviewCardApplication({ applicationId, decision, backgroundCheck, creditLimitCents: Math.round(Number(creditLimits[applicationId] || "5000") * 100), adminNote: "Reviewed in operations console" })
      if (!result.ok) { setError(result.error); return }
      setNotice("Card application updated.")
      setCardApplications(await getAdminCardApplications())
    })
  }

  async function signOut() {
    await authClient.signOut()
    window.location.href = "/sign-in"
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></div><div><p className="font-semibold">BitNobe Operations</p><p className="text-xs text-muted-foreground">{role} console · actions are audited</p></div></div>
          <div className="flex items-center gap-3 text-right"><div className="hidden sm:block"><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">{email}</p></div><Button variant="outline" size="sm" onClick={signOut}>Sign out</Button></div>
        </div>
      </header>
      <div className="border-b bg-card/70">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 text-xs sm:px-6">
          <a href="#card-review" className="whitespace-nowrap rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary">Card review</a>
          <a href="#members" className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Members</a>
          <a href="#account-operations" className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Account operations</a>
          <a href="#member-tools" className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Identity & security</a>
          <a href="#audit" className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">Audit trail</a>
        </div>
      </div>
      <div id="card-review" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <Card><CardHeader><CardTitle>Card application review</CardTitle><CardDescription>New card approvals are temporarily paused for all members. Pending applications can be declined after review.</CardDescription></CardHeader><CardContent className="space-y-2">{cardApplications.length === 0 ? <p className="text-sm text-muted-foreground">No card applications awaiting review.</p> : cardApplications.map((application) => <div key={application.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"><span className="min-w-44 flex-1"><span className="font-medium">{application.userName}</span><span className="ml-2 text-muted-foreground">{application.userEmail}</span><span className="ml-2 capitalize">{application.cardType} card</span>{application.cardType === "credit" && <span className="mt-1 block text-xs text-muted-foreground">{application.legalName || application.userName} · {application.citizenshipStatus || "residency not provided"} · {application.employmentStatus || "employment not provided"} · income ${(application.annualIncome / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} · {application.identificationType?.toUpperCase() || "ID"} ending {application.identificationLast4 || "----"}</span>}</span><span className="text-muted-foreground">{application.backgroundCheckStatus}</span>{application.status === "pending" && <Button size="sm" variant="destructive" onClick={() => reviewCard(application.id, "decline", "failed")} disabled={pending}>Decline</Button>}</div>)}</CardContent></Card>
      </div>
      <div id="members" className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[19rem_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Members</CardTitle><CardDescription>Support activity and account access.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" aria-label="Search members" className="pl-8" /></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"><option value="all">All account statuses</option><option value="active">Active only</option><option value="dormant">Dormant only</option><option value="restricted">Restricted only</option><option value="suspended">Suspended only</option><option value="closed">Closed only</option></select>
            <p className="text-xs text-muted-foreground">{filteredUsers.length} of {users.length} members</p>
            {filteredUsers.map((user) => <button key={user.id} type="button" onClick={() => { setSelectedId(user.id); setError(null); setNotice(null); void getAdminAuditLog(user.id).then(setAuditEntries) }} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${selectedId === user.id ? "bg-primary/10" : "hover:bg-muted"}`}><Avatar><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{user.email}</span></span><span className={`text-[11px] font-medium ${user.status === "active" ? "text-emerald-600" : "text-destructive"}`}>{user.status}</span>{user.unreadMessages > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{user.unreadMessages}</span>}</button>)}
            {filteredUsers.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No matching members.</p>}
          </CardContent>
        </Card>

        {selectedUser ? <div id="account-operations" className="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <Card className="min-w-0"><CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" />{selectedUser.name}<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${selectedUser.status === "suspended" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`}>{selectedUser.status}</span></CardTitle><CardDescription>{selectedUser.email} · Account {selectedUser.accountNumber ?? "not opened"}</CardDescription></CardHeader><CardContent><div className="min-h-72 max-h-[30rem] space-y-3 overflow-y-auto rounded-lg bg-muted/50 p-4" aria-live="polite">{messages.length === 0 ? <p className="py-20 text-center text-sm text-muted-foreground">No messages from this member.</p> : messages.map((message) => <div key={message.id} className={`flex ${message.sender === "bank" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.sender === "bank" ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-border"}`}><p>{message.body}</p><p className="mt-1 text-[11px] text-muted-foreground">{message.sender === "bank" ? "You" : selectedUser.name} · {formatDateTime(message.createdAt)}</p></div></div>)}</div><form onSubmit={submitReply} className="mt-3 flex gap-2"><Input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to member" maxLength={2000} disabled={pending} aria-label="Reply to member" /><Button type="submit" size="icon" aria-label="Send reply" disabled={pending || !reply.trim()}><Send className="h-4 w-4" /></Button></form></CardContent></Card>
          <div className="space-y-4"><Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" />Account controls</CardTitle><CardDescription>Authorized balance operations for this member.</CardDescription></CardHeader><CardContent><div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm">Current balance: <span className="font-semibold">${(selectedUser.balance / 100).toFixed(2)}</span></div><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reason or note" maxLength={200} aria-label="Transaction note" disabled={pending} /><div className="mt-3 grid grid-cols-2 gap-2"><form onSubmit={submitCredit} className="space-y-2"><Input type="number" min="0.01" step="0.01" value={credit} onChange={(event) => setCredit(event.target.value)} placeholder="Credit USD" aria-label="Credit amount" disabled={pending} required /><Button className="w-full" type="submit" disabled={pending}><Banknote className="mr-2 h-4 w-4" />Credit</Button></form><form onSubmit={submitDebit} className="space-y-2"><Input type="number" min="0.01" step="0.01" value={debit} onChange={(event) => setDebit(event.target.value)} placeholder="Debit USD" aria-label="Debit amount" disabled={pending} required /><Button className="w-full" type="submit" variant="outline" disabled={pending}>Debit</Button></form></div>{notice && <p className="mt-3 flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-4 w-4" />{notice}</p>}{error && <p className="mt-3 text-xs text-destructive">{error}</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Account and fraud controls</CardTitle><CardDescription>Status changes, risk review, and session controls are audited.</CardDescription></CardHeader><CardContent className="space-y-3"><label className="text-xs font-medium">Account status<select value={selectedUser.status} onChange={(event) => saveUserControl(event.target.value as AdminUser["status"])} disabled={pending} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"><option value="active">Active</option><option value="dormant">Dormant</option><option value="restricted">Restricted</option><option value="suspended">Suspended</option><option value="closed">Closed</option></select></label><div><div className="flex items-center justify-between text-xs font-medium"><label htmlFor="risk-score">Risk score</label><span>{riskScore}/100</span></div><input id="risk-score" type="range" min="0" max="100" value={riskScore} onChange={(event) => setRiskScore(event.target.value)} className="mt-2 w-full accent-primary" disabled={pending} /><div className="flex justify-between text-[11px] text-muted-foreground"><span>Low</span><span>High</span></div></div><label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" checked={fraudFreeze} onChange={(event) => setFraudFreeze(event.target.checked)} disabled={pending} /><ShieldAlert className="h-4 w-4" />Place temporary fraud freeze</label><textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={500} placeholder="Internal admin note" aria-label="Internal admin note" disabled={pending} className="min-h-20 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50" /><Button variant="outline" className="w-full" onClick={saveAdminNote} disabled={pending}>Save controls and note</Button><Button variant="outline" className="w-full" onClick={revokeSessions} disabled={pending}><LockKeyhole className="mr-2 h-4 w-4" />Revoke all sessions</Button>{selectedUser.controlUpdatedAt && <p className="text-xs text-muted-foreground">Last control change {formatDateTime(selectedUser.controlUpdatedAt)}</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileClock className="h-5 w-5 text-primary" />Audit trail</CardTitle><CardDescription>Recent administrative actions for this member.</CardDescription></CardHeader><CardContent className="space-y-2">{auditEntries.length === 0 ? <p className="text-sm text-muted-foreground">No actions recorded yet.</p> : auditEntries.slice(0, 8).map((entry) => <div key={entry.id} className="border-b pb-2 text-xs last:border-0"><p className="font-medium">{entry.action.replaceAll("_", " ")}</p><p className="text-muted-foreground">{entry.adminEmail} · {formatDateTime(entry.createdAt)}</p></div>)}</CardContent></Card></div>
          <div id="member-tools" className="xl:col-span-2"><AdminMemberOperations user={selectedUser} /></div>
        </div> : <Card><CardContent className="py-20 text-center text-sm text-muted-foreground">Select a member to begin.</CardContent></Card>}
      </div>
    </main>
  )
}
