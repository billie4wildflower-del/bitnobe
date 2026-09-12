"use server"

import { auth } from "@/lib/auth"
import { db, pool } from "@/lib/db"
import { bankAccount, bankTransaction, user } from "@/lib/db/schema"
import { and, desc, eq, ne, or, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { isAdminEmail } from "@/lib/auth"

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  await ensureAdminControlsTable()
  await ensureBankingFeaturesTables()
  const control = await pool.query<{ status: "active" | "suspended" }>(
    `SELECT status FROM admin_user_control WHERE user_id = $1`,
    [session.user.id],
  )
  if (control.rows[0]?.status === "suspended") throw new Error("Account suspended")
  return session.user
}

async function requireAdmin() {
  const sessionUser = await getSessionUser()
  if (!isAdminEmail(sessionUser.email)) throw new Error("Forbidden")
  return sessionUser
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
    isAdmin: isAdminEmail(sessionUser.email),
  }
}

export async function getProfile() {
  const sessionUser = await getSessionUser()
  const acct = await ensureAccount()
  return {
    user: {
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      emailVerified: sessionUser.emailVerified,
      createdAt: sessionUser.createdAt,
    },
    account: {
      accountNumber: acct.accountNumber,
      routingNumber: acct.routingNumber,
      balance: acct.balance,
      openedAt: acct.createdAt,
    },
    isAdmin: isAdminEmail(sessionUser.email),
  }
}

export async function updateProfile(input: { name: string }) {
  const sessionUser = await getSessionUser()
  const name = input.name.trim().replace(/\s+/g, " ")
  if (name.length < 2) return { ok: false as const, error: "Enter a name with at least 2 characters." }
  if (name.length > 80) return { ok: false as const, error: "Names must be 80 characters or less." }

  await db.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, sessionUser.id))
  revalidatePath("/")
  revalidatePath("/profile")
  return { ok: true as const, name }
}

// Other registered users this user can send money to.
export async function getRecipients() {
  const sessionUser = await getSessionUser()
  await ensureBankingFeaturesTables()
  const result = await pool.query<RecipientRecord>(
    `SELECT u.id, u.name, u.email, ba."accountNumber" AS "accountNumber",
       EXISTS (SELECT 1 FROM transfer_contact tc WHERE tc.owner_user_id = $1 AND tc.contact_user_id = u.id) AS "isContact",
      EXISTS (SELECT 1 FROM bank_transaction bt WHERE (bt."fromUserId" = $1 AND bt."toUserId" = u.id) OR (bt."toUserId" = $1 AND bt."fromUserId" = u.id)) AS "hasPreviousTransfer"
     FROM "user" u
     JOIN bank_account ba ON ba."userId" = u.id
     WHERE u.id <> $1
       AND (EXISTS (SELECT 1 FROM transfer_contact tc WHERE tc.owner_user_id = $1 AND tc.contact_user_id = u.id)
         OR EXISTS (SELECT 1 FROM bank_transaction bt WHERE (bt."fromUserId" = $1 AND bt."toUserId" = u.id) OR (bt."toUserId" = $1 AND bt."fromUserId" = u.id)))
     ORDER BY "hasPreviousTransfer" DESC, u.name ASC
     LIMIT 50`,
    [sessionUser.id],
  )
  return result.rows
}

export type RecipientRecord = {
  id: string
  name: string
  email: string
  accountNumber: string
  isContact: boolean
  hasPreviousTransfer: boolean
}

export async function searchRecipients(query: string) {
  const sessionUser = await getSessionUser()
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return [] as RecipientRecord[]

  const result = await pool.query<RecipientRecord>(
    `SELECT u.id, u.name, u.email, ba."accountNumber" AS "accountNumber",
       EXISTS (SELECT 1 FROM transfer_contact tc WHERE tc.owner_user_id = $1 AND tc.contact_user_id = u.id) AS "isContact",
      EXISTS (SELECT 1 FROM bank_transaction bt WHERE (bt."fromUserId" = $1 AND bt."toUserId" = u.id) OR (bt."toUserId" = $1 AND bt."fromUserId" = u.id)) AS "hasPreviousTransfer"
     FROM "user" u
     JOIN bank_account ba ON ba."userId" = u.id
     WHERE u.id <> $1 AND (lower(u.email) LIKE $2 OR ba."accountNumber" LIKE $3)
     ORDER BY "hasPreviousTransfer" DESC, u.name ASC
     LIMIT 10`,
    [sessionUser.id, `%${normalizedQuery}%`, `%${query.trim()}%`],
  )
  return result.rows
}

async function ensureBankingFeaturesTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transfer_contact (
      owner_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      contact_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (owner_user_id, contact_user_id),
      CHECK (owner_user_id <> contact_user_id)
    );
    CREATE TABLE IF NOT EXISTS card_application (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      card_type TEXT NOT NULL CHECK (card_type IN ('debit', 'credit')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
      background_check_status TEXT NOT NULL DEFAULT 'required' CHECK (background_check_status IN ('required', 'pending', 'passed', 'failed')),
      admin_note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS wire_transfer (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL CHECK (amount > 0),
      beneficiary_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      routing_number TEXT NOT NULL,
      account_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

export async function addTransferContact(identifier: string) {
  const sessionUser = await getSessionUser()
  const normalizedIdentifier = identifier.trim().toLowerCase()
  if (!normalizedIdentifier) return { ok: false as const, error: "Enter a member email or account number." }
  const [contact] = await db
    .select({ id: user.id })
    .from(user)
    .innerJoin(bankAccount, eq(bankAccount.userId, user.id))
    .where(or(eq(sql`lower(${user.email})`, normalizedIdentifier), eq(bankAccount.accountNumber, identifier.trim())))
    .limit(1)
  if (!contact) return { ok: false as const, error: "No registered member matches that email or account number." }
  if (contact.id === sessionUser.id) return { ok: false as const, error: "You cannot add yourself." }
  await ensureBankingFeaturesTables()
  await pool.query(`INSERT INTO transfer_contact (owner_user_id, contact_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [sessionUser.id, contact.id])
  revalidatePath("/")
  return { ok: true as const }
}

export async function removeTransferContact(contactUserId: string) {
  const sessionUser = await getSessionUser()
  await ensureBankingFeaturesTables()
  await pool.query(`DELETE FROM transfer_contact WHERE owner_user_id = $1 AND contact_user_id = $2`, [sessionUser.id, contactUserId])
  revalidatePath("/")
  return { ok: true as const }
}

export type CardApplication = {
  id: number
  cardType: "debit" | "credit"
  status: "pending" | "approved" | "declined"
  backgroundCheckStatus: "required" | "pending" | "passed" | "failed"
  adminNote: string
  createdAt: Date
}

export async function getCardApplications() {
  const sessionUser = await getSessionUser()
  await ensureBankingFeaturesTables()
  const result = await pool.query<CardApplication>(`SELECT id, card_type AS "cardType", status, background_check_status AS "backgroundCheckStatus", admin_note AS "adminNote", created_at AS "createdAt" FROM card_application WHERE user_id = $1 ORDER BY created_at DESC`, [sessionUser.id])
  return result.rows
}

export async function applyForCard(cardType: "debit" | "credit") {
  const sessionUser = await getSessionUser()
  if (cardType !== "debit" && cardType !== "credit") return { ok: false as const, error: "Choose a valid card type." }
  await ensureBankingFeaturesTables()
  const existing = await pool.query(`SELECT id FROM card_application WHERE user_id = $1 AND card_type = $2 AND status IN ('pending', 'approved') LIMIT 1`, [sessionUser.id, cardType])
  if (existing.rowCount) return { ok: false as const, error: `You already have an active ${cardType} card application.` }
  await pool.query(`INSERT INTO card_application (user_id, card_type, background_check_status) VALUES ($1, $2, $3)`, [sessionUser.id, cardType, cardType === "credit" ? "pending" : "required"])
  revalidatePath("/")
  return { ok: true as const }
}

export type WireTransfer = { id: number; amount: number; beneficiaryName: string; bankName: string; routingNumber: string; accountNumber: string; status: "pending" | "processing" | "completed" | "rejected"; createdAt: Date }

export async function getWireTransfers() {
  const sessionUser = await getSessionUser()
  await ensureBankingFeaturesTables()
  const result = await pool.query<WireTransfer>(`SELECT id, amount, beneficiary_name AS "beneficiaryName", bank_name AS "bankName", routing_number AS "routingNumber", account_number AS "accountNumber", status, created_at AS "createdAt" FROM wire_transfer WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [sessionUser.id])
  return result.rows
}

export async function requestWireTransfer(input: { amountCents: number; beneficiaryName: string; bankName: string; routingNumber: string; accountNumber: string }) {
  const sessionUser = await getSessionUser()
  const beneficiaryName = input.beneficiaryName.trim()
  const bankName = input.bankName.trim()
  const routingNumber = input.routingNumber.trim()
  const accountNumber = input.accountNumber.trim()
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) return { ok: false as const, error: "Enter a valid withdrawal amount." }
  if (input.amountCents > 100_000_00) return { ok: false as const, error: "Wire withdrawals are limited to $100,000." }
  if (!beneficiaryName || !bankName || !routingNumber || !accountNumber) return { ok: false as const, error: "Complete all wire details." }
  await ensureBankingFeaturesTables()
  const account = await ensureAccount()
  if (account.balance < input.amountCents) return { ok: false as const, error: "Amount exceeds your available balance." }
  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(bankAccount).where(eq(bankAccount.userId, sessionUser.id)).for("update")
    if (!locked || locked.balance < input.amountCents) throw new Error("INSUFFICIENT_FUNDS")
    const [owner] = await tx.select({ name: user.name }).from(user).where(eq(user.id, sessionUser.id)).limit(1)
    await tx.update(bankAccount).set({ balance: sql`${bankAccount.balance} - ${input.amountCents}` }).where(eq(bankAccount.userId, sessionUser.id))
    await tx.insert(bankTransaction).values({
      fromUserId: sessionUser.id,
      toUserId: "wire",
      fromName: owner?.name ?? "Member",
      toName: beneficiaryName,
      fromAccountNumber: locked.accountNumber,
      toAccountNumber: accountNumber,
      amount: input.amountCents,
      note: `Wire withdrawal to ${bankName}`,
    })
    await tx.execute(sql`INSERT INTO wire_transfer (user_id, amount, beneficiary_name, bank_name, routing_number, account_number) VALUES (${sessionUser.id}, ${input.amountCents}, ${beneficiaryName}, ${bankName}, ${routingNumber}, ${accountNumber})`)
  })
  revalidatePath("/")
  return { ok: true as const }
}

export type AdminCardApplication = CardApplication & { userId: string; userName: string; userEmail: string }

export async function getAdminCardApplications() {
  await requireAdmin()
  await ensureBankingFeaturesTables()
  const result = await pool.query<AdminCardApplication>(`SELECT ca.id, ca.user_id AS "userId", u.name AS "userName", u.email AS "userEmail", ca.card_type AS "cardType", ca.status, ca.background_check_status AS "backgroundCheckStatus", ca.admin_note AS "adminNote", ca.created_at AS "createdAt" FROM card_application ca JOIN "user" u ON u.id = ca.user_id ORDER BY ca.created_at DESC LIMIT 100`)
  return result.rows
}

export async function reviewCardApplication(input: { applicationId: number; decision: "approve" | "decline"; backgroundCheck: "passed" | "failed"; adminNote: string }) {
  const admin = await requireAdmin()
  if (!Number.isInteger(input.applicationId)) return { ok: false as const, error: "Choose a valid application." }
  if (input.decision === "approve" && input.backgroundCheck !== "passed") return { ok: false as const, error: "A credit card requires a passed background check before approval." }
  await ensureBankingFeaturesTables()
  const status = input.decision === "approve" ? "approved" : "declined"
  const note = input.adminNote.trim().slice(0, 500) || `Reviewed by ${admin.email}`
  const result = await pool.query(`UPDATE card_application SET status = $1, background_check_status = $2, admin_note = $3, updated_at = NOW() WHERE id = $4`, [status, input.backgroundCheck, note, input.applicationId])
  if (!result.rowCount) return { ok: false as const, error: "Card application not found." }
  revalidatePath("/admin")
  revalidatePath("/")
  return { ok: true as const }
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

async function ensureAdminControlsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_user_control (
      user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
      admin_note TEXT NOT NULL DEFAULT '',
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

export type AdminUser = {
  id: string
  name: string
  email: string
  image: string | null
  createdAt: Date
  accountNumber: string | null
  balance: number
  lastMessageAt: Date | null
  unreadMessages: number
  status: "active" | "suspended"
  adminNote: string
  controlUpdatedAt: Date | null
}

export async function getAdminDashboard() {
  await requireAdmin()
  await ensureSupportMessagesTable()
  await ensureAdminControlsTable()
  const result = await pool.query<AdminUser>(`
    SELECT u.id, u.name, u.email, u.image, u."createdAt",
      ba."accountNumber", COALESCE(ba.balance, 0)::integer AS balance,
      COALESCE(auc.status, 'active') AS status,
      COALESCE(auc.admin_note, '') AS "adminNote",
      auc.updated_at AS "controlUpdatedAt",
      MAX(sm.created_at) AS "lastMessageAt",
      COUNT(sm.id) FILTER (
        WHERE sm.sender = 'member'
          AND sm.created_at > COALESCE(
            (SELECT MAX(sm2.created_at) FROM support_message sm2 WHERE sm2.user_id = u.id AND sm2.sender = 'bank'),
            'epoch'::timestamptz
          )
      )::integer AS "unreadMessages"
    FROM "user" u
    LEFT JOIN bank_account ba ON ba."userId" = u.id
    LEFT JOIN admin_user_control auc ON auc.user_id = u.id
    LEFT JOIN support_message sm ON sm.user_id = u.id
    GROUP BY u.id, ba."accountNumber", ba.balance, auc.status, auc.admin_note, auc.updated_at
    ORDER BY MAX(sm.created_at) DESC NULLS LAST, u.name ASC
  `)
  return result.rows
}

export async function updateAdminUserControl(input: {
  userId: string
  status: "active" | "suspended"
  adminNote: string
}) {
  const admin = await requireAdmin()
  if (!input.userId || input.userId === admin.id) return { ok: false as const, error: "You cannot change your own admin access." }
  if (!['active', 'suspended'].includes(input.status)) return { ok: false as const, error: "Choose a valid account status." }
  const adminNote = input.adminNote.trim().slice(0, 500)
  await ensureAdminControlsTable()
  await pool.query(
    `INSERT INTO admin_user_control (user_id, status, admin_note, updated_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, admin_note = EXCLUDED.admin_note,
       updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [input.userId, input.status, adminNote, admin.email],
  )
  if (input.status === "suspended") {
    await pool.query(`DELETE FROM session WHERE "userId" = $1`, [input.userId])
  }
  revalidatePath("/admin")
  revalidatePath("/")
  return { ok: true as const }
}

export async function revokeUserSessions(userId: string) {
  const admin = await requireAdmin()
  if (!userId || userId === admin.id) return { ok: false as const, error: "You cannot revoke your own admin sessions." }
  await pool.query(`DELETE FROM session WHERE "userId" = $1`, [userId])
  await ensureAdminControlsTable()
  await pool.query(
    `INSERT INTO admin_user_control (user_id, updated_by, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [userId, admin.email],
  )
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function getAdminConversation(userId: string) {
  await requireAdmin()
  await ensureSupportMessagesTable()
  const result = await pool.query<SupportMessage>(
    `SELECT id, sender, body, created_at AS "createdAt"
     FROM support_message WHERE user_id = $1 ORDER BY created_at ASC LIMIT 200`,
    [userId],
  )
  return result.rows
}

export async function sendAdminSupportMessage(userId: string, body: string) {
  await requireAdmin()
  const message = body.trim()
  if (!userId || !message) return { ok: false as const, error: "Choose a member and write a message." }
  if (message.length > 2000) return { ok: false as const, error: "Messages must be 2,000 characters or less." }
  await ensureSupportMessagesTable()
  const result = await pool.query<SupportMessage>(
    `INSERT INTO support_message (user_id, sender, body) VALUES ($1, 'bank', $2)
     RETURNING id, sender, body, created_at AS "createdAt"`,
    [userId, message],
  )
  revalidatePath("/admin")
  return { ok: true as const, message: result.rows[0] }
}

export async function postBankCredit(userId: string, amountCents: number, note: string) {
  const admin = await requireAdmin()
  if (!userId || !Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false as const, error: "Enter a valid credit amount." }
  }
  if (amountCents > 100_000_00) return { ok: false as const, error: "Credits are limited to $100,000 per operation." }
  try {
    await db.transaction(async (tx) => {
      const [recipient] = await tx.select().from(bankAccount).where(eq(bankAccount.userId, userId)).for("update")
      if (!recipient) throw new Error("ACCOUNT_NOT_FOUND")
      const [recipientUser] = await tx.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1)
      await tx.update(bankAccount).set({ balance: sql`${bankAccount.balance} + ${amountCents}` }).where(eq(bankAccount.userId, userId))
      await tx.insert(bankTransaction).values({
        fromUserId: "bank",
        toUserId: userId,
        fromName: "BitNobe Bank Operations",
        toName: recipientUser?.name ?? "Member",
        fromAccountNumber: "BANK",
        toAccountNumber: recipient.accountNumber,
        amount: amountCents,
        note: note.trim().slice(0, 200) || `Authorized by ${admin.email}`,
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") return { ok: false as const, error: "Member account not found." }
    return { ok: false as const, error: "Bank credit could not be posted." }
  }
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function postBankDebit(userId: string, amountCents: number, note: string) {
  const admin = await requireAdmin()
  if (!userId || !Number.isInteger(amountCents) || amountCents <= 0) return { ok: false as const, error: "Enter a valid debit amount." }
  if (amountCents > 100_000_00) return { ok: false as const, error: "Debits are limited to $100,000 per operation." }
  try {
    await db.transaction(async (tx) => {
      const [recipient] = await tx.select().from(bankAccount).where(eq(bankAccount.userId, userId)).for("update")
      if (!recipient) throw new Error("ACCOUNT_NOT_FOUND")
      if (recipient.balance < amountCents) throw new Error("INSUFFICIENT_FUNDS")
      const [recipientUser] = await tx.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1)
      await tx.update(bankAccount).set({ balance: sql`${bankAccount.balance} - ${amountCents}` }).where(eq(bankAccount.userId, userId))
      await tx.insert(bankTransaction).values({
        fromUserId: userId, toUserId: "bank", fromName: recipientUser?.name ?? "Member", toName: "BitNobe Bank Operations",
        fromAccountNumber: recipient.accountNumber, toAccountNumber: "BANK", amount: amountCents,
        note: note.trim().slice(0, 200) || `Authorized by ${admin.email}`,
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_NOT_FOUND") return { ok: false as const, error: "Member account not found." }
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") return { ok: false as const, error: "Debit exceeds the available balance." }
    return { ok: false as const, error: "Bank debit could not be posted." }
  }
  revalidatePath("/admin")
  return { ok: true as const }
}

// Atomic transfer between two registered users.
export async function transfer(input: { toUserId?: string; recipientIdentifier?: string; amountCents: number; note?: string }) {
  const sessionUser = await getSessionUser()
  await ensureAccount()
  await ensureBankingFeaturesTables()

  let toUserId = input.toUserId ?? ""
  const { amountCents, note } = input

  if (!toUserId && input.recipientIdentifier?.trim()) {
    const identifier = input.recipientIdentifier.trim()
    const [recipient] = await db
      .select({ id: user.id })
      .from(user)
      .innerJoin(bankAccount, eq(bankAccount.userId, user.id))
      .where(or(eq(sql`lower(${user.email})`, identifier.toLowerCase()), eq(bankAccount.accountNumber, identifier)))
      .limit(1)
    toUserId = recipient?.id ?? ""
  }

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
