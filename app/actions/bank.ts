"use server"

import { auth } from "@/lib/auth"
import { db, pool } from "@/lib/db"
import { bankAccount, bankTransaction, user } from "@/lib/db/schema"
import { and, desc, eq, ne, or, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user
}

function generateAccountNumber(): string {
  let n = ""
  for (let i = 0; i < 10; i++) n += Math.floor(Math.random() * 10).toString()
  return n
}

// Every user gets exactly one bank account, created on first access.
export async function ensureAccount() {
  const sessionUser = await getSessionUser()
  const existing = await db.select().from(bankAccount).where(eq(bankAccount.userId, sessionUser.id)).limit(1)
  if (existing.length > 0) return existing[0]

  const [created] = await db
    .insert(bankAccount)
    .values({ userId: sessionUser.id, accountNumber: generateAccountNumber() })
    .onConflictDoNothing()
    .returning()

  if (created) return created
  const [row] = await db.select().from(bankAccount).where(eq(bankAccount.userId, sessionUser.id)).limit(1)
  return row
}

export async function getAccountSummary() {
  const sessionUser = await getSessionUser()
  const acct = await ensureAccount()

  const txns = await db
    .select()
    .from(bankTransaction)
    .where(or(eq(bankTransaction.fromUserId, sessionUser.id), eq(bankTransaction.toUserId, sessionUser.id)))
    .orderBy(desc(bankTransaction.createdAt))
    .limit(50)

  return {
    user: { id: sessionUser.id, name: sessionUser.name, email: sessionUser.email },
    account: {
      accountNumber: acct.accountNumber,
      routingNumber: acct.routingNumber,
      balance: acct.balance,
    },
    transactions: txns,
  }
}

// Other registered users this user can send money to.
export async function getRecipients() {
  const sessionUser = await getSessionUser()
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      accountNumber: bankAccount.accountNumber,
    })
    .from(user)
    .innerJoin(bankAccount, eq(bankAccount.userId, user.id))
    .where(ne(user.id, sessionUser.id))
    .orderBy(user.name)
  return rows
}

export async function getRegisteredUsers() {
  await getSessionUser()
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(user.name)
}

async function ensureSupportMessagesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_message (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      sender TEXT NOT NULL CHECK (sender IN ('member', 'bank')),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

export type SupportMessage = {
  id: number
  sender: "member" | "bank"
  body: string
  createdAt: Date
}

export async function getSupportMessages() {
  const sessionUser = await getSessionUser()
  await ensureSupportMessagesTable()
  const result = await pool.query<SupportMessage>(
    `SELECT id, sender, body, created_at AS "createdAt"
     FROM support_message
     WHERE user_id = $1
     ORDER BY created_at ASC
     LIMIT 100`,
    [sessionUser.id],
  )
  return result.rows
}

export async function sendSupportMessage(body: string) {
  const sessionUser = await getSessionUser()
  const message = body.trim()
  if (!message) return { ok: false as const, error: "Write a message before sending." }
  if (message.length > 2000) return { ok: false as const, error: "Messages must be 2,000 characters or less." }

  await ensureSupportMessagesTable()
  const result = await pool.query<SupportMessage>(
    `INSERT INTO support_message (user_id, sender, body)
     VALUES ($1, 'member', $2)
     RETURNING id, sender, body, created_at AS "createdAt"`,
    [sessionUser.id, message],
  )
  revalidatePath("/support")
  return { ok: true as const, message: result.rows[0] }
}

// Atomic transfer between two registered users.
export async function transfer(input: { toUserId: string; amountCents: number; note?: string }) {
  const sessionUser = await getSessionUser()
  await ensureAccount()

  const { toUserId, amountCents, note } = input

  if (!toUserId || toUserId === sessionUser.id) {
    return { ok: false as const, error: "Choose a valid recipient." }
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false as const, error: "Enter a valid amount." }
  }
  if (amountCents > 100_000_00) {
    return { ok: false as const, error: "Transfers are limited to $100,000 per transaction." }
  }

  try {
    await db.transaction(async (tx) => {
      // Lock both accounts in a consistent order (by userId) to avoid deadlocks.
      const ids = [sessionUser.id, toUserId].sort()
      const locked = await tx
        .select()
        .from(bankAccount)
        .where(or(eq(bankAccount.userId, ids[0]), eq(bankAccount.userId, ids[1])))
        .for("update")

      const sender = locked.find((a) => a.userId === sessionUser.id)
      const recipient = locked.find((a) => a.userId === toUserId)

      if (!recipient) throw new Error("RECIPIENT_NOT_FOUND")
      if (!sender) throw new Error("SENDER_NOT_FOUND")
      if (sender.balance < amountCents) throw new Error("INSUFFICIENT_FUNDS")

      const [senderUser, recipientUser] = await Promise.all([
        tx.select({ name: user.name }).from(user).where(eq(user.id, sessionUser.id)).limit(1),
        tx.select({ name: user.name }).from(user).where(eq(user.id, toUserId)).limit(1),
      ])

      await tx
        .update(bankAccount)
        .set({ balance: sql`${bankAccount.balance} - ${amountCents}` })
        .where(eq(bankAccount.userId, sessionUser.id))
      await tx
        .update(bankAccount)
        .set({ balance: sql`${bankAccount.balance} + ${amountCents}` })
        .where(eq(bankAccount.userId, toUserId))

      await tx.insert(bankTransaction).values({
        fromUserId: sessionUser.id,
        toUserId,
        fromName: senderUser[0]?.name ?? "You",
        toName: recipientUser[0]?.name ?? "Recipient",
        fromAccountNumber: sender.accountNumber,
        toAccountNumber: recipient.accountNumber,
        amount: amountCents,
        note: note?.slice(0, 200) ?? null,
      })
    })
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN"
    if (code === "INSUFFICIENT_FUNDS") return { ok: false as const, error: "Insufficient funds for this transfer." }
    if (code === "RECIPIENT_NOT_FOUND") return { ok: false as const, error: "Recipient account not found." }
    console.log("[v0] transfer error:", code)
    return { ok: false as const, error: "Transfer could not be completed." }
  }

  revalidatePath("/")
  return { ok: true as const }
}
