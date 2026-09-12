"use client"

import { FormEvent, useEffect, useState, useTransition } from "react"
import { Headphones, Send } from "lucide-react"

import { getSupportMessages, sendSupportMessage, type SupportMessage } from "@/app/actions/bank"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function SupportDirectory({ initialMessages }: { initialMessages: SupportMessage[] }) {
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        setMessages(await getSupportMessages())
      } catch {
        // A session expiry is handled on the next navigation.
      }
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
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="border-b pb-6">
        <p className="text-sm text-muted-foreground">Member support</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Talk to BitNobe</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Send a private message to the bank team about your account or a transfer.</p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Headphones className="h-5 w-5 text-primary" />Live support chat</CardTitle>
          <CardDescription>Replies appear here automatically while you wait.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-80 max-h-[28rem] space-y-3 overflow-y-auto rounded-lg bg-muted/50 p-4" aria-live="polite">
            {messages.length === 0 ? <p className="py-20 text-center text-sm text-muted-foreground">Your conversation is empty. Send a message to get started.</p> : messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "member" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${message.sender === "member" ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-border"}`}>
                  <p>{message.body}</p>
                  <p className={`mt-1 text-[11px] ${message.sender === "member" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{message.sender === "member" ? "You" : "BitNobe support"} · {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={submitMessage} className="mt-3 flex gap-2">
            <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write to support" maxLength={2000} aria-label="Message BitNobe support" disabled={pending} />
            <Button type="submit" size="icon" aria-label="Send message" disabled={pending || !draft.trim()}><Send className="h-4 w-4" /></Button>
          </form>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </main>
  )
}
