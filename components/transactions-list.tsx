import { ArrowDownLeft, ArrowUpRight, Inbox } from "lucide-react"
import { formatCents, formatDate, maskAccount } from "@/lib/format"

export type Transaction = {
  id: number
  fromUserId: string
  toUserId: string
  fromName: string
  toName: string
  fromAccountNumber: string
  toAccountNumber: string
  amount: number
  note: string | null
  createdAt: Date | string
}

export function TransactionsList({
  transactions,
  currentUserId,
}: {
  transactions: Transaction[]
  currentUserId: string
}) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No transactions yet</p>
        <p className="text-sm text-muted-foreground">Your BitNobe activity will appear here.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y">
      {transactions.map((txn) => {
        const isCredit = txn.toUserId === currentUserId
        const counterparty = isCredit ? txn.fromName : txn.toName
        const counterAccount = isCredit ? txn.fromAccountNumber : txn.toAccountNumber

        return (
          <li key={txn.id} className="flex items-center gap-4 py-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isCredit ? "bg-primary/10 text-primary" : "bg-muted text-foreground"
              }`}
            >
              {isCredit ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{counterparty}</p>
              <p className="truncate text-xs text-muted-foreground">
                {counterAccount === "EXTERNAL" ? "External" : maskAccount(counterAccount)}
                {txn.note ? ` · ${txn.note}` : ""} · {formatDate(txn.createdAt)}
              </p>
            </div>
            <div className={`shrink-0 text-sm font-semibold ${isCredit ? "text-primary" : "text-foreground"}`}>
              {isCredit ? "+" : "−"}
              {formatCents(txn.amount)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
