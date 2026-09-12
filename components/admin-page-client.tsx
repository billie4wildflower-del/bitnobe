"use client"

import { FormEvent, useEffect, useState, useTransition } from "react"
import { Banknote, CheckCircle2, LockKeyhole, MessageCircle, Search, Send, ShieldCheck, UnlockKeyhole, UserCog } from "lucide-react"

import { getAdminCardApplications, getAdminConversation, getAdminDashboard, postBankCredit, postBankDebit, reviewCardApplication, revokeUserSessions, sendAdminSupportMessage, updateAdminUserControl, type AdminCardApplication, type AdminUser, type SupportMessage } from "@/app/actions/bank"
import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

export function AdminPageClient({ name, email, initialUsers }: { name: string; email: string; initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [selectedId, setSelectedId] = useState(initialUsers[0]?.id ?? "")
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [reply, setReply] = useState("")
  const [credit, setCredit] = useState("")
  const [debit, setDebit] = useState("")
  const [note, setNote] = useState("")
  const [adminNote, setAdminNote] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [cardApplications, setCardApplications] = useState<AdminCardApplication[]>([])
  const [backgroundChecks, setBackgroundChecks] = useState<Record<number, "passed" | "failed">>({})
  const selectedUser = users.find((user) => user.id === selectedId)
  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase()
    const matchesQuery = !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query) || user.accountNumber?.includes(query)
    return matchesQuery && (statusFilter === "all" || user.status === statusFilter)
  })

  useEffect(() => {
    if (selectedUser) setAdminNote(selectedUser.adminNote)
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

  useEffect(() => { void getAdminCardApplications().then(setCardApplications) }, [])

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

  function saveUserControl(status: "active" | "suspended") {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await updateAdminUserControl({ userId: selectedId, status, adminNote })
      if (!result.ok) { setError(result.error); return }
      setNotice(status === "suspended" ? "Member access suspended and sessions revoked." : "Member access restored.")
      setUsers(await getAdminDashboard())
    })
  }

  function saveAdminNote() {
    if (!selectedUser) return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await updateAdminUserControl({ userId: selectedId, status: selectedUser.status, adminNote })
      if (!result.ok) { setError(result.error); return }
      setNotice("Internal note saved.")
      setUsers(await getAdminDashboard())
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
    })
  }

  function reviewCard(applicationId: number, decision: "approve" | "decline", backgroundCheck: "passed" | "failed") {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await reviewCardApplication({ applicationId, decision, backgroundCheck, adminNote: "Reviewed in operations console" })
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
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="h-5 w-5" /></div><div><p className="font-semibold">BitNobe Operations</p><p className="text-xs text-muted-foreground">Restricted admin console</p></div></div>
          <div className="flex items-center gap-3 text-right"><div className="hidden sm:block"><p className="text-sm font-medium">{name}</p><p className="text-xs text-muted-foreground">{email}</p></div><Button variant="outline" size="sm" onClick={signOut}>Sign out</Button></div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <Card><CardHeader><CardTitle>Card application review</CardTitle><CardDescription>Credit cards require a passed background check before approval.</CardDescription></CardHeader><CardContent className="space-y-2">{cardApplications.length === 0 ? <p className="text-sm text-muted-foreground">No card applications awaiting review.</p> : cardApplications.map((application) => <div key={application.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"><span className="min-w-44 flex-1"><span className="font-medium">{application.userName}</span><span className="ml-2 text-muted-foreground">{application.userEmail}</span><span className="ml-2 capitalize">{application.cardType} card</span></span>{application.cardType === "credit" && application.status === "pending" && <select value={backgroundChecks[application.id] ?? "failed"} onChange={(event) => setBackgroundChecks((current) => ({ ...current, [application.id]: event.target.value as "passed" | "failed" }))} aria-label={`Background check for ${application.userName}`} className="h-8 rounded-lg border border-input bg-background px-2 text-sm"><option value="failed">Check failed</option><option value="passed">Check passed</option></select>}<span className="text-muted-foreground">{application.backgroundCheckStatus}</span>{application.status === "pending" && <><Button size="sm" variant="outline" onClick={() => reviewCard(application.id, "approve", application.cardType === "credit" ? (backgroundChecks[application.id] ?? "failed") : "passed")} disabled={pending}>Approve</Button><Button size="sm" variant="destructive" onClick={() => reviewCard(application.id, "decline", "failed")} disabled={pending}>Decline</Button></>}</div>)}</CardContent></Card>
      </div>
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[19rem_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Members</CardTitle><CardDescription>Support activity and account access.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative"><Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" aria-label="Search members" className="pl-8" /></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"><option value="all">All account statuses</option><option value="active">Active only</option><option value="suspended">Suspended only</option></select>
            <p className="text-xs text-muted-foreground">{filteredUsers.length} of {users.length} members</p>
            {filteredUsers.map((user) => <button key={user.id} type="button" onClick={() => { setSelectedId(user.id); setError(null); setNotice(null) }} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${selectedId === user.id ? "bg-primary/10" : "hover:bg-muted"}`}><Avatar><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{user.email}</span></span><span className={`text-[11px] font-medium ${user.status === "suspended" ? "text-destructive" : "text-emerald-600"}`}>{user.status}</span>{user.unreadMessages > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{user.unreadMessages}</span>}</button>)}
            {filteredUsers.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No matching members.</p>}
          </CardContent>
        </Card>

        {selectedUser ? <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <Card className="min-w-0"><CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" />{selectedUser.name}<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${selectedUser.status === "suspended" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`}>{selectedUser.status}</span></CardTitle><CardDescription>{selectedUser.email} · Account {selectedUser.accountNumber ?? "not opened"}</CardDescription></CardHeader><CardContent><div className="min-h-72 max-h-[30rem] space-y-3 overflow-y-auto rounded-lg bg-muted/50 p-4" aria-live="polite">{messages.length === 0 ? <p className="py-20 text-center text-sm text-muted-foreground">No messages from this member.</p> : messages.map((message) => <div key={message.id} className={`flex ${message.sender === "bank" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.sender === "bank" ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-border"}`}><p>{message.body}</p><p className="mt-1 text-[11px] text-muted-foreground">{message.sender === "bank" ? "You" : selectedUser.name} · {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p></div></div>)}</div><form onSubmit={submitReply} className="mt-3 flex gap-2"><Input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to member" maxLength={2000} disabled={pending} aria-label="Reply to member" /><Button type="submit" size="icon" aria-label="Send reply" disabled={pending || !reply.trim()}><Send className="h-4 w-4" /></Button></form></CardContent></Card>
          <div className="space-y-4"><Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" />Account controls</CardTitle><CardDescription>Authorized balance operations for this member.</CardDescription></CardHeader><CardContent><div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm">Current balance: <span className="font-semibold">${(selectedUser.balance / 100).toFixed(2)}</span></div><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reason or note" maxLength={200} aria-label="Transaction note" disabled={pending} /><div className="mt-3 grid grid-cols-2 gap-2"><form onSubmit={submitCredit} className="space-y-2"><Input type="number" min="0.01" step="0.01" value={credit} onChange={(event) => setCredit(event.target.value)} placeholder="Credit USD" aria-label="Credit amount" disabled={pending} required /><Button className="w-full" type="submit" disabled={pending}><Banknote className="mr-2 h-4 w-4" />Credit</Button></form><form onSubmit={submitDebit} className="space-y-2"><Input type="number" min="0.01" step="0.01" value={debit} onChange={(event) => setDebit(event.target.value)} placeholder="Debit USD" aria-label="Debit amount" disabled={pending} required /><Button className="w-full" type="submit" variant="outline" disabled={pending}>Debit</Button></form></div>{notice && <p className="mt-3 flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-4 w-4" />{notice}</p>}{error && <p className="mt-3 text-xs text-destructive">{error}</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Access controls</CardTitle><CardDescription>Changes are logged and enforced immediately.</CardDescription></CardHeader><CardContent className="space-y-3"><textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={500} placeholder="Internal admin note" aria-label="Internal admin note" disabled={pending} className="min-h-20 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50" /><Button variant="outline" className="w-full" onClick={saveAdminNote} disabled={pending}>Save internal note</Button><div className="grid grid-cols-2 gap-2"><Button variant={selectedUser.status === "active" ? "secondary" : "outline"} onClick={() => saveUserControl("active")} disabled={pending || selectedUser.status === "active"}><UnlockKeyhole className="mr-2 h-4 w-4" />Activate</Button><Button variant="destructive" onClick={() => saveUserControl("suspended")} disabled={pending || selectedUser.status === "suspended"}><LockKeyhole className="mr-2 h-4 w-4" />Suspend</Button></div><Button variant="outline" className="w-full" onClick={revokeSessions} disabled={pending}>Revoke all sessions</Button>{selectedUser.controlUpdatedAt && <p className="text-xs text-muted-foreground">Last control change {new Date(selectedUser.controlUpdatedAt).toLocaleString()}</p>}</CardContent></Card></div>
        </div> : <Card><CardContent className="py-20 text-center text-sm text-muted-foreground">Select a member to begin.</CardContent></Card>}
      </div>
    </main>
  )
}
