"use client"

import type React from "react"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { addTransferContact, searchRecipients, transfer, type RecipientRecord } from "@/app/actions/bank"
import { formatCents, maskAccount, parseDollarsToCents } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type Recipient = {
  id: string
  name: string
  email: string
  accountNumber: string
  isContact?: boolean
  hasPreviousTransfer?: boolean
}

export function SendMoneyDialog({
  open,
  onOpenChange,
  recipients,
  balance,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipients: Recipient[]
  balance: number
}) {
  const router = useRouter()
  const [toUserId, setToUserId] = useState("")
  const [recipientQuery, setRecipientQuery] = useState("")
  const [searchResults, setSearchResults] = useState<RecipientRecord[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)
  const [saveContact, setSaveContact] = useState(false)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setToUserId("")
    setRecipientQuery("")
    setSearchResults([])
    setSelectedRecipient(null)
    setSaveContact(false)
    setAmount("")
    setNote("")
    setError(null)
  }

  useEffect(() => {
    const query = recipientQuery.trim()
    if (!query) {
      setSearchResults([])
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      void searchRecipients(query).then((results) => {
        if (active) setSearchResults(results)
      })
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [recipientQuery])

  function selectRecipient(recipient: Recipient) {
    setToUserId(recipient.id)
    setRecipientQuery(recipient.email)
    setSelectedRecipient(recipient)
    setSearchResults([])
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!toUserId) {
      setError("Select a recipient.")
      return
    }
    const cents = parseDollarsToCents(amount)
    if (cents === null) {
      setError("Enter a valid dollar amount.")
      return
    }
    if (cents > balance) {
      setError("Amount exceeds your available balance.")
      return
    }

    startTransition(async () => {
      const res = await transfer({ toUserId: toUserId || undefined, recipientIdentifier: recipientQuery, amountCents: cents, note: note.trim() || undefined })
      if (!res.ok) {
        setError(res.error)
        return
      }
      const recipient = recipients.find((r) => r.id === toUserId)
      const chosenRecipient = recipient ?? selectedRecipient
      if (saveContact && !chosenRecipient?.isContact) {
        const contactResult = await addTransferContact(chosenRecipient?.email ?? recipientQuery)
        if (!contactResult.ok) toast.error("Transfer sent, but the contact could not be saved", { description: contactResult.error })
      }
      toast.success("Transfer sent", {
        description: `${amount} sent to ${chosenRecipient?.name ?? "recipient"}.`,
      })
      reset()
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send money</DialogTitle>
          <DialogDescription>Transfer funds to another registered member.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipient">Recipient email or account number</Label>
              <Input
                id="recipient"
                value={recipientQuery}
                onChange={(e) => { setRecipientQuery(e.target.value); setToUserId(""); setSelectedRecipient(null) }}
                placeholder="name@example.com or account number"
                autoComplete="off"
                required
              />
              {(searchResults.length > 0 || (!recipientQuery && recipients.length > 0)) && <div className="max-h-36 overflow-y-auto rounded-md border bg-popover p-1">
                {(searchResults.length > 0 ? searchResults : recipients.slice(0, 5)).map((recipient) => <button
                  key={recipient.id}
                  type="button"
                  onClick={() => selectRecipient(recipient)}
                  className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <span><span className="font-medium">{recipient.name}</span><span className="ml-2 text-muted-foreground">{recipient.email}</span></span>
                  <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground">{maskAccount(recipient.accountNumber)}</span>
                </button>)}
              </div>}
              {recipientQuery && !toUserId && searchResults.length === 0 && <p className="text-xs text-muted-foreground">Keep typing to find a registered member.</p>}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={saveContact} onChange={(e) => setSaveContact(e.target.checked)} />
              Save this recipient to my contacts
            </label>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="send-amount">Amount</Label>
                <span className="text-xs text-muted-foreground">Available: {formatCents(balance)}</span>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="send-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for?"
                maxLength={200}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send transfer
              </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
