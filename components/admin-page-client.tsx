"use client"

import { FormEvent, useEffect, useState, useTransition } from "react"
import { Banknote, CheckCircle2, MessageCircle, Send, ShieldCheck } from "lucide-react"

import { getAdminConversation, getAdminDashboard, postBankCredit, sendAdminSupportMessage, type AdminUser, type SupportMessage } from "@/app/actions/bank"
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
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const selectedUser = users.find((user) => user.id === selectedId)

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
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[19rem_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Members</CardTitle><CardDescription>Support activity and account access.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {users.map((user) => <button key={user.id} type="button" onClick={() => { setSelectedId(user.id); setError(null); setNotice(null) }} className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${selectedId === user.id ? "bg-primary/10" : "hover:bg-muted"}`}><Avatar><AvatarFallback>{initials(user.name)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{user.email}</span></span>{user.unreadMessages > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{user.unreadMessages}</span>}</button>)}
            {users.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No members yet.</p>}
          </CardContent>
        </Card>

        {selectedUser ? <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <Card className="min-w-0"><CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" />{selectedUser.name}</CardTitle><CardDescription>{selectedUser.email} · Account {selectedUser.accountNumber ?? "not opened"}</CardDescription></CardHeader><CardContent><div className="min-h-72 max-h-[30rem] space-y-3 overflow-y-auto rounded-lg bg-muted/50 p-4" aria-live="polite">{messages.length === 0 ? <p className="py-20 text-center text-sm text-muted-foreground">No messages from this member.</p> : messages.map((message) => <div key={message.id} className={`flex ${message.sender === "bank" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.sender === "bank" ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-border"}`}><p>{message.body}</p><p className="mt-1 text-[11px] text-muted-foreground">{message.sender === "bank" ? "You" : selectedUser.name} · {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p></div></div>)}</div><form onSubmit={submitReply} className="mt-3 flex gap-2"><Input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to member" maxLength={2000} disabled={pending} aria-label="Reply to member" /><Button type="submit" size="icon" aria-label="Send reply" disabled={pending || !reply.trim()}><Send className="h-4 w-4" /></Button></form></CardContent></Card>
          <Card className="h-fit"><CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" />Account controls</CardTitle><CardDescription>Post an authorized credit to this member.</CardDescription></CardHeader><CardContent><form onSubmit={submitCredit} className="space-y-3"><Input type="number" min="0.01" step="0.01" value={credit} onChange={(event) => setCredit(event.target.value)} placeholder="Amount in USD" aria-label="Credit amount" disabled={pending} required /><Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reason or note" maxLength={200} aria-label="Credit note" disabled={pending} /><Button className="w-full" type="submit" disabled={pending}><Banknote className="mr-2 h-4 w-4" />Post credit</Button></form>{notice && <p className="mt-3 flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-4 w-4" />{notice}</p>}{error && <p className="mt-3 text-xs text-destructive">{error}</p>}<p className="mt-4 border-t pt-4 text-sm text-muted-foreground">Current balance: <span className="font-medium text-foreground">${(selectedUser.balance / 100).toFixed(2)}</span></p></CardContent></Card>
        </div> : <Card><CardContent className="py-20 text-center text-sm text-muted-foreground">Select a member to begin.</CardContent></Card>}
      </div>
    </main>
  )
}
