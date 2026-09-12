"use client"

import type React from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { transfer } from "@/app/actions/bank"
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
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setToUserId("")
    setAmount("")
    setNote("")
    setError(null)
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
      const res = await transfer({ toUserId, amountCents: cents, note: note.trim() || undefined })
      if (!res.ok) {
        setError(res.error)
        return
      }
      const recipient = recipients.find((r) => r.id === toUserId)
      toast.success("Transfer sent", {
        description: `${amount} sent to ${recipient?.name ?? "recipient"}.`,
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

        {recipients.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No other members are registered yet. Once another person creates an account, you can send them money.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipient">Recipient</Label>
              <select
                id="recipient"
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>
                  Select a member
                </option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {maskAccount(r.accountNumber)}
                  </option>
                ))}
              </select>
            </div>

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
        )}
      </DialogContent>
    </Dialog>
  )
}
