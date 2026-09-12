"use client"

import { FormEvent, useEffect, useState, useTransition } from "react"
import { Mail, MessageCircle, Search, Send, Users } from "lucide-react"

import { getSupportMessages, sendSupportMessage, type SupportMessage } from "@/app/actions/bank"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type RegisteredUser = {
  id: string
  name: string
  email: string
  image: string | null
  createdAt: Date
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()
}

export function SupportDirectory({ users, initialMessages }: { users: RegisteredUser[]; initialMessages: SupportMessage[] }) {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const normalizedQuery = query.trim().toLowerCase()
  const filteredUsers = users.filter((member) =>
    `${member.name} ${member.email}`.toLowerCase().includes(normalizedQuery),
  )

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const latestMessages = await getSupportMessages()
      setMessages(latestMessages)
    }, 5000)
    return () => window.clearInterval(interval)
  }, [])

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await sendSupportMessage(draft)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setMessages((current) => [...current, result.message])
      setDraft("")
    })
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Internal support directory</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Registered members</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Find a member profile when investigating a transfer or coordinating account support.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="h-10 pl-9" aria-label="Search registered members" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="h-fit"><CardContent className="p-5"><div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /><div><p className="font-medium">Live bank chat</p><p className="text-xs text-muted-foreground">BitNobe support replies appear here</p></div></div><div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-muted/50 p-3" aria-live="polite">{messages.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Send a message to start a conversation with BitNobe support.</p> : messages.map((message) => <div key={message.id} className={`flex ${message.sender === "member" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.sender === "member" ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-border"}`}><p>{message.body}</p><p className={`mt-1 text-[11px] ${message.sender === "member" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{message.sender === "member" ? "You" : "BitNobe support"} · {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p></div></div>)}</div><form onSubmit={submitMessage} className="mt-3 flex gap-2"><Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message support" maxLength={2000} aria-label="Message BitNobe support" disabled={pending} /><Button type="submit" size="icon" aria-label="Send message" disabled={pending || !draft.trim()}><Send className="h-4 w-4" /></Button></form>{error && <p className="mt-2 text-xs text-destructive">{error}</p>}</CardContent></Card>
        <div><div className="flex items-center gap-2 text-sm text-muted-foreground"><Users className="h-4 w-4" />{filteredUsers.length} {filteredUsers.length === 1 ? "registered member" : "registered members"}</div>
      {filteredUsers.length === 0 ? (
        <Card className="mt-4"><CardContent className="flex flex-col items-center gap-2 py-16 text-center"><Users className="h-8 w-8 text-muted-foreground" /><p className="font-medium">No members found</p><p className="text-sm text-muted-foreground">Try a different name or email address.</p></CardContent></Card>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((member) => (
            <Card key={member.id} className="transition-shadow hover:shadow-md"><CardContent className="p-5"><div className="flex items-start gap-3"><Avatar size="lg"><AvatarImage src={member.image ?? undefined} alt="" /><AvatarFallback className="bg-primary/10 text-primary">{initials(member.name)}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate font-medium">{member.name}</p><p className="truncate text-sm text-muted-foreground">{member.email}</p><p className="mt-2 text-xs text-muted-foreground">Member since {member.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p></div></div><a href={`mailto:${member.email}`} className="mt-5 flex items-center gap-2 border-t pt-4 text-sm font-medium text-primary hover:underline"><Mail className="h-4 w-4" />Contact member</a></CardContent></Card>
          ))}
        </div>
      )}
        </div>
      </div>
    </main>
  )
}