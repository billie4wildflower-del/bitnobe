"use server"

import { auth } from "@/lib/auth"
import { db, pool } from "@/lib/db"
import { bankAccount, bankTransaction, user } from "@/lib/db/schema"
import { and, desc, eq, ne, or, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { getAdminRole, isAdminEmail, type AdminRole } from "@/lib/auth"

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  await ensureAdminControlsTable()
  await ensureBankingFeaturesTables()
  const control = await pool.query<{ status: "active" | "dormant" | "restricted" | "closed" | "suspended"; fraud_freeze: boolean }>(
    `SELECT status, fraud_freeze FROM admin_user_control WHERE user_id = $1`,
    [session.user.id],
  )
  if (control.rows[0]?.status === "suspended" || control.rows[0]?.status === "closed") throw new Error("Account unavailable")
  return session.user
}

async function requireAdmin() {
  const sessionUser = await getSessionUser()
  if (!getAdminRole(sessionUser.email) && !isAdminEmail(sessionUser.email)) throw new Error("Forbidden")
  return sessionUser
}

async function requireAdminRole(requiredRole: AdminRole) {
  const sessionUser = await requireAdmin()
  const role = getAdminRole(sessionUser.email) ?? "manager"
  const levels: Record<AdminRole, number> = { support: 1, manager: 2, engineering: 3 }
  if (levels[role] < levels[requiredRole]) throw new Error("Insufficient administrative permission")
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
  const control = await pool.query<{ status: "active" | "dormant" | "restricted" | "closed" | "suspended"; fraud_freeze: boolean }>(`SELECT status, fraud_freeze FROM admin_user_control WHERE user_id = $1`, [sessionUser.id])

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
      status: control.rows[0]?.status ?? "active",
      fraudFreeze: control.rows[0]?.fraud_freeze ?? false,
    },
    transactions: txns,
    isAdmin: Boolean(getAdminRole(sessionUser.email) || isAdminEmail(sessionUser.email)),
  }
}

export async function getProfile() {
  const sessionUser = await getSessionUser()
  const acct = await ensureAccount()
  const control = await pool.query<{ status: "active" | "dormant" | "restricted" | "closed" | "suspended"; fraud_freeze: boolean }>(`SELECT status, fraud_freeze FROM admin_user_control WHERE user_id = $1`, [sessionUser.id])
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
      status: control.rows[0]?.status ?? "active",
      fraudFreeze: control.rows[0]?.fraud_freeze ?? false,
    },
    isAdmin: Boolean(getAdminRole(sessionUser.email) || isAdminEmail(sessionUser.email)),
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
      legal_name TEXT NOT NULL DEFAULT '',
      date_of_birth DATE,
      residential_address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      citizenship_status TEXT NOT NULL DEFAULT '',
      identification_type TEXT NOT NULL DEFAULT '',
      identification_last4 TEXT NOT NULL DEFAULT '',
      employment_status TEXT NOT NULL DEFAULT '',
      employer_name TEXT NOT NULL DEFAULT '',
      employer_phone TEXT NOT NULL DEFAULT '',
      annual_income INTEGER NOT NULL DEFAULT 0,
      monthly_housing_payment INTEGER NOT NULL DEFAULT 0,
      bank_account_type TEXT NOT NULL DEFAULT '',
      credit_limit INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS legal_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS date_of_birth DATE;
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS residential_address TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS citizenship_status TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS identification_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS identification_last4 TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS employer_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS employer_phone TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS annual_income INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS monthly_housing_payment INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS bank_account_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE card_application ADD COLUMN IF NOT EXISTS credit_limit INTEGER NOT NULL DEFAULT 0;
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
  creditLimit: number
  createdAt: Date
  applicant?: CreditApplicationInput
}

export type CreditApplicationInput = {
  legalName: string
  dateOfBirth: string
  residentialAddress: string
  phone: string
  citizenshipStatus: "us_citizen" | "permanent_resident" | "other"
  identificationType: "ssn" | "itin"
  identificationLast4: string
  employmentStatus: "employed" | "self_employed" | "retired" | "unemployed"
  employerName: string
  employerPhone: string
  annualIncomeCents: number
  monthlyHousingPaymentCents: number
  bankAccountType: "" | "checking" | "savings"
}

export async function getCardApplications() {
  const sessionUser = await getSessionUser()
  await ensureBankingFeaturesTables()
  const result = await pool.query<CardApplication>(`SELECT id, card_type AS "cardType", status, background_check_status AS "backgroundCheckStatus", admin_note AS "adminNote", credit_limit AS "creditLimit", created_at AS "createdAt" FROM card_application WHERE user_id = $1 ORDER BY created_at DESC`, [sessionUser.id])
  return result.rows
}

export async function applyForCard(cardType: "debit" | "credit", input?: CreditApplicationInput) {
  const sessionUser = await getSessionUser()
  if (cardType !== "debit" && cardType !== "credit") return { ok: false as const, error: "Choose a valid card type." }
  if (cardType === "credit") {
    if (!input) return { ok: false as const, error: "Complete the credit card application." }
    if (!input.legalName.trim() || !input.dateOfBirth || !input.residentialAddress.trim() || !input.phone.trim()) return { ok: false as const, error: "Complete your legal name, date of birth, address, phone, and email details." }
    const birthDate = new Date(`${input.dateOfBirth}T00:00:00Z`)
    const adultDate = new Date()
    adultDate.setUTCFullYear(adultDate.getUTCFullYear() - 18)
    if (Number.isNaN(birthDate.getTime()) || birthDate > adultDate) return { ok: false as const, error: "Credit applicants must be at least 18 years old." }
    if (!["us_citizen", "permanent_resident", "other"].includes(input.citizenshipStatus)) return { ok: false as const, error: "Choose a valid citizenship or residency status." }
    if (!["ssn", "itin"].includes(input.identificationType) || !/^\d{4}$/.test(input.identificationLast4)) return { ok: false as const, error: "Enter the last four digits of your SSN or ITIN." }
    if (!["employed", "self_employed", "retired", "unemployed"].includes(input.employmentStatus)) return { ok: false as const, error: "Choose a valid employment status." }
    if (!Number.isInteger(input.annualIncomeCents) || input.annualIncomeCents < 0 || !Number.isInteger(input.monthlyHousingPaymentCents) || input.monthlyHousingPaymentCents < 0) return { ok: false as const, error: "Enter valid income and housing amounts." }
  }
  await ensureBankingFeaturesTables()
  const existing = await pool.query(`SELECT id FROM card_application WHERE user_id = $1 AND card_type = $2 AND status IN ('pending', 'approved') LIMIT 1`, [sessionUser.id, cardType])
  if (existing.rowCount) return { ok: false as const, error: `You already have an active ${cardType} card application.` }
  if (cardType === "credit" && input) {
    await pool.query(`INSERT INTO card_application (user_id, card_type, background_check_status, legal_name, date_of_birth, residential_address, phone, citizenship_status, identification_type, identification_last4, employment_status, employer_name, employer_phone, annual_income, monthly_housing_payment, bank_account_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [sessionUser.id, cardType, "pending", input.legalName.trim().slice(0, 120), input.dateOfBirth, input.residentialAddress.trim().slice(0, 300), input.phone.trim().slice(0, 40), input.citizenshipStatus, input.identificationType, input.identificationLast4, input.employmentStatus, input.employerName.trim().slice(0, 120), input.employerPhone.trim().slice(0, 40), input.annualIncomeCents, input.monthlyHousingPaymentCents, input.bankAccountType])
  } else {
    await pool.query(`INSERT INTO card_application (user_id, card_type, background_check_status) VALUES ($1, $2, $3)`, [sessionUser.id, cardType, "required"])
  }
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

export type AdminCardApplication = CardApplication & { userId: string; userName: string; userEmail: string; legalName: string; citizenshipStatus: string; identificationType: string; identificationLast4: string; employmentStatus: string; annualIncome: number; monthlyHousingPayment: number }

export async function getAdminCardApplications() {
  await requireAdmin()
  await ensureBankingFeaturesTables()
  const result = await pool.query<AdminCardApplication>(`SELECT ca.id, ca.user_id AS "userId", u.name AS "userName", u.email AS "userEmail", ca.card_type AS "cardType", ca.status, ca.background_check_status AS "backgroundCheckStatus", ca.admin_note AS "adminNote", ca.created_at AS "createdAt", ca.legal_name AS "legalName", ca.citizenship_status AS "citizenshipStatus", ca.identification_type AS "identificationType", ca.identification_last4 AS "identificationLast4", ca.employment_status AS "employmentStatus", ca.annual_income AS "annualIncome", ca.monthly_housing_payment AS "monthlyHousingPayment" FROM card_application ca JOIN "user" u ON u.id = ca.user_id ORDER BY ca.created_at DESC LIMIT 100`)
  return result.rows
}

export async function reviewCardApplication(input: { applicationId: number; decision: "approve" | "decline"; backgroundCheck: "passed" | "failed"; creditLimitCents: number; adminNote: string }) {
  const admin = await requireAdminRole("manager")
  if (!Number.isInteger(input.applicationId)) return { ok: false as const, error: "Choose a valid application." }
  if (input.decision === "approve" && input.backgroundCheck !== "passed") return { ok: false as const, error: "A credit card requires a passed background check before approval." }
  if (!Number.isInteger(input.creditLimitCents) || input.creditLimitCents < 0 || input.creditLimitCents > 100_000_00) return { ok: false as const, error: "Enter a credit limit between $0 and $100,000." }
  await ensureBankingFeaturesTables()
  const status = input.decision === "approve" ? "approved" : "declined"
  const note = input.adminNote.trim().slice(0, 500) || `Reviewed by ${admin.email}`
  const result = await pool.query(`UPDATE card_application SET status = $1, background_check_status = $2, credit_limit = $3, admin_note = $4, updated_at = NOW() WHERE id = $5`, [status, input.backgroundCheck, input.creditLimitCents, note, input.applicationId])
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
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'restricted', 'closed', 'suspended')),
      admin_note TEXT NOT NULL DEFAULT '',
      risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
      fraud_freeze BOOLEAN NOT NULL DEFAULT FALSE,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`ALTER TABLE admin_user_control DROP CONSTRAINT IF EXISTS admin_user_control_status_check`)
  await pool.query(`ALTER TABLE admin_user_control ADD CONSTRAINT admin_user_control_status_check CHECK (status IN ('active', 'dormant', 'restricted', 'closed', 'suspended'))`)
  await pool.query(`ALTER TABLE admin_user_control ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0`)
  await pool.query(`ALTER TABLE admin_user_control ADD COLUMN IF NOT EXISTS fraud_freeze BOOLEAN NOT NULL DEFAULT FALSE`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_action_log (
      id BIGSERIAL PRIMARY KEY,
      admin_user_id TEXT NOT NULL REFERENCES "user"(id),
      target_user_id TEXT REFERENCES "user"(id),
      action TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_user_profile (
      user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      legal_name TEXT NOT NULL DEFAULT '',
      date_of_birth DATE,
      residential_address TEXT NOT NULL DEFAULT '',
      mailing_address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      tax_id_last4 TEXT NOT NULL DEFAULT '',
      employment_profile TEXT NOT NULL DEFAULT '',
      kyc_status TEXT NOT NULL DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'verified', 'rejected')),
      kyc_document_note TEXT NOT NULL DEFAULT '',
      marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
      alert_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS admin_security_event (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS admin_transaction_action (
      id BIGSERIAL PRIMARY KEY,
      transaction_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('reversal_requested', 'reversed', 'recalled', 'fee_refunded')),
      note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

async function logAdminAction(adminUserId: string, action: string, targetUserId: string | null, details: Record<string, unknown> = {}) {
  await ensureAdminControlsTable()
  await pool.query(
    `INSERT INTO admin_action_log (admin_user_id, target_user_id, action, details) VALUES ($1, $2, $3, $4::jsonb)`,
    [adminUserId, targetUserId, action, JSON.stringify(details)],
  )
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
  status: "active" | "dormant" | "restricted" | "closed" | "suspended"
  adminNote: string
  riskScore: number
  fraudFreeze: boolean
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
      COALESCE(auc.risk_score, 0)::integer AS "riskScore",
      COALESCE(auc.fraud_freeze, false) AS "fraudFreeze",
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
    GROUP BY u.id, ba."accountNumber", ba.balance, auc.status, auc.admin_note, auc.risk_score, auc.fraud_freeze, auc.updated_at
    ORDER BY MAX(sm.created_at) DESC NULLS LAST, u.name ASC
  `)
  return result.rows
}

export async function updateAdminUserControl(input: {
  userId: string
  status: "active" | "dormant" | "restricted" | "closed" | "suspended"
  adminNote: string
  riskScore?: number
  fraudFreeze?: boolean
}) {
  const admin = await requireAdminRole("manager")
  if (!input.userId || input.userId === admin.id) return { ok: false as const, error: "You cannot change your own admin access." }
  if (!['active', 'dormant', 'restricted', 'closed', 'suspended'].includes(input.status)) return { ok: false as const, error: "Choose a valid account status." }
  if (input.riskScore !== undefined && (!Number.isInteger(input.riskScore) || input.riskScore < 0 || input.riskScore > 100)) return { ok: false as const, error: "Risk score must be between 0 and 100." }
  const adminNote = input.adminNote.trim().slice(0, 500)
  const riskScore = input.riskScore ?? 0
  const fraudFreeze = input.fraudFreeze ?? false
  await ensureAdminControlsTable()
  await pool.query(
    `INSERT INTO admin_user_control (user_id, status, admin_note, risk_score, fraud_freeze, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, admin_note = EXCLUDED.admin_note,
       risk_score = EXCLUDED.risk_score, fraud_freeze = EXCLUDED.fraud_freeze,
       updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [input.userId, input.status, adminNote, riskScore, fraudFreeze, admin.email],
  )
  if (input.status === "suspended" || input.status === "closed" || input.fraudFreeze) {
    await pool.query(`DELETE FROM session WHERE "userId" = $1`, [input.userId])
  }
  await logAdminAction(admin.id, "user_control_updated", input.userId, { status: input.status, riskScore, fraudFreeze, note: adminNote })
  revalidatePath("/admin")
  revalidatePath("/")
  return { ok: true as const }
}

export async function revokeUserSessions(userId: string) {
  const admin = await requireAdminRole("manager")
  if (!userId || userId === admin.id) return { ok: false as const, error: "You cannot revoke your own admin sessions." }
  await pool.query(`DELETE FROM session WHERE "userId" = $1`, [userId])
  await ensureAdminControlsTable()
  await pool.query(
    `INSERT INTO admin_user_control (user_id, updated_by, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [userId, admin.email],
  )
  await logAdminAction(admin.id, "sessions_revoked", userId)
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
  const admin = await requireAdmin()
  const message = body.trim()
  if (!userId || !message) return { ok: false as const, error: "Choose a member and write a message." }
  if (message.length > 2000) return { ok: false as const, error: "Messages must be 2,000 characters or less." }
  await ensureSupportMessagesTable()
  const result = await pool.query<SupportMessage>(
    `INSERT INTO support_message (user_id, sender, body) VALUES ($1, 'bank', $2)
     RETURNING id, sender, body, created_at AS "createdAt"`,
    [userId, message],
  )
  await logAdminAction(admin.id, "support_message_sent", userId, { messageId: result.rows[0].id })
  revalidatePath("/admin")
  return { ok: true as const, message: result.rows[0] }
}

export async function postBankCredit(userId: string, amountCents: number, note: string) {
  const admin = await requireAdminRole("manager")
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
  await logAdminAction(admin.id, "balance_credited", userId, { amountCents, note: note.trim().slice(0, 200) })
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function postBankDebit(userId: string, amountCents: number, note: string) {
  const admin = await requireAdminRole("manager")
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
  await logAdminAction(admin.id, "balance_debited", userId, { amountCents, note: note.trim().slice(0, 200) })
  revalidatePath("/admin")
  return { ok: true as const }
}

export type AdminAuditEntry = {
  id: string
  action: string
  adminEmail: string
  targetName: string | null
  details: Record<string, unknown>
  createdAt: Date
}

export type AdminUserProfile = {
  userId: string
  legalName: string
  dateOfBirth: string | null
  residentialAddress: string
  mailingAddress: string
  phone: string
  taxIdLast4: string
  employmentProfile: string
  kycStatus: "not_started" | "pending" | "verified" | "rejected"
  kycDocumentNote: string
  marketingOptIn: boolean
  alertOptIn: boolean
}

export type AdminSession = { id: string; userAgent: string | null; ipAddress: string | null; createdAt: Date; expiresAt: Date }

export async function getAdminUserProfile(userId: string) {
  await requireAdmin()
  await ensureAdminControlsTable()
  const result = await pool.query<AdminUserProfile>(
    `SELECT user_id AS "userId", legal_name AS "legalName", date_of_birth AS "dateOfBirth", residential_address AS "residentialAddress", mailing_address AS "mailingAddress", phone, tax_id_last4 AS "taxIdLast4", employment_profile AS "employmentProfile", kyc_status AS "kycStatus", kyc_document_note AS "kycDocumentNote", marketing_opt_in AS "marketingOptIn", alert_opt_in AS "alertOptIn" FROM admin_user_profile WHERE user_id = $1`,
    [userId],
  )
  return result.rows[0] ?? { userId, legalName: "", dateOfBirth: null, residentialAddress: "", mailingAddress: "", phone: "", taxIdLast4: "", employmentProfile: "", kycStatus: "not_started" as const, kycDocumentNote: "", marketingOptIn: false, alertOptIn: true }
}

export async function updateAdminUserProfile(input: Omit<AdminUserProfile, "userId"> & { userId: string }) {
  const admin = await requireAdminRole("manager")
  if (!input.userId || !["not_started", "pending", "verified", "rejected"].includes(input.kycStatus)) return { ok: false as const, error: "Enter valid profile and KYC details." }
  await ensureAdminControlsTable()
  await pool.query(
    `INSERT INTO admin_user_profile (user_id, legal_name, date_of_birth, residential_address, mailing_address, phone, tax_id_last4, employment_profile, kyc_status, kyc_document_note, marketing_opt_in, alert_opt_in, updated_by)
     VALUES ($1, $2, NULLIF($3, '')::date, $4, $5, $6, RIGHT($7, 4), $8, $9, $10, $11, $12, $13)
     ON CONFLICT (user_id) DO UPDATE SET legal_name = EXCLUDED.legal_name, date_of_birth = EXCLUDED.date_of_birth, residential_address = EXCLUDED.residential_address, mailing_address = EXCLUDED.mailing_address, phone = EXCLUDED.phone, tax_id_last4 = EXCLUDED.tax_id_last4, employment_profile = EXCLUDED.employment_profile, kyc_status = EXCLUDED.kyc_status, kyc_document_note = EXCLUDED.kyc_document_note, marketing_opt_in = EXCLUDED.marketing_opt_in, alert_opt_in = EXCLUDED.alert_opt_in, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [input.userId, input.legalName.trim().slice(0, 120), input.dateOfBirth ?? "", input.residentialAddress.trim().slice(0, 300), input.mailingAddress.trim().slice(0, 300), input.phone.trim().slice(0, 40), input.taxIdLast4.trim().slice(-4), input.employmentProfile.trim().slice(0, 200), input.kycStatus, input.kycDocumentNote.trim().slice(0, 500), input.marketingOptIn, input.alertOptIn, admin.email],
  )
  await logAdminAction(admin.id, "profile_updated", input.userId, { kycStatus: input.kycStatus })
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function requestAdminCredentialReset(userId: string) {
  const admin = await requireAdminRole("manager")
  if (!userId) return { ok: false as const, error: "Choose a member first." }
  await ensureAdminControlsTable()
  await pool.query(`INSERT INTO admin_security_event (user_id, event_type, details, created_by) VALUES ($1, 'credential_reset_requested', 'Mandatory password reset requested by operations.', $2)`, [userId, admin.email])
  await pool.query(`DELETE FROM session WHERE "userId" = $1`, [userId])
  await logAdminAction(admin.id, "credential_reset_requested", userId)
  return { ok: true as const }
}

export async function getAdminUserSessions(userId: string) {
  await requireAdmin()
  return (await pool.query<AdminSession>(`SELECT id, "userAgent", "ipAddress", "createdAt", "expiresAt" FROM session WHERE "userId" = $1 ORDER BY "createdAt" DESC`, [userId])).rows
}

export async function terminateAdminSession(sessionId: string) {
  const admin = await requireAdminRole("manager")
  if (!sessionId) return { ok: false as const, error: "Choose a session." }
  const result = await pool.query<{ userId: string }>(`DELETE FROM session WHERE id = $1 RETURNING "userId"`, [sessionId])
  if (!result.rowCount) return { ok: false as const, error: "Session not found." }
  await logAdminAction(admin.id, "session_terminated", result.rows[0].userId, { sessionId })
  return { ok: true as const }
}

export type AdminTransaction = {
  id: number
  fromUserId: string
  toUserId: string
  fromName: string
  toName: string
  amount: number
  note: string | null
  createdAt: Date
  action: "reversed" | "reversal_requested" | "recalled" | "fee_refunded" | null
}

export async function getAdminUserTransactions(userId: string) {
  await requireAdmin()
  await ensureAdminControlsTable()
  return (await pool.query<AdminTransaction>(
    `SELECT bt.id, bt."fromUserId", bt."toUserId", bt."fromName", bt."toName", bt.amount, bt.note, bt."createdAt", ata.action
     FROM bank_transaction bt LEFT JOIN LATERAL (SELECT action FROM admin_transaction_action WHERE transaction_id = bt.id ORDER BY created_at DESC LIMIT 1) ata ON TRUE
     WHERE bt."fromUserId" = $1 OR bt."toUserId" = $1 ORDER BY bt."createdAt" DESC LIMIT 50`,
    [userId],
  )).rows
}

export async function reverseAdminTransaction(transactionId: number, note: string) {
  const admin = await requireAdminRole("manager")
  if (!Number.isInteger(transactionId) || transactionId <= 0) return { ok: false as const, error: "Choose a valid transaction." }
  await ensureAdminControlsTable()
  const existing = await pool.query<{ action: string }>(`SELECT action FROM admin_transaction_action WHERE transaction_id = $1 AND action = 'reversed' LIMIT 1`, [transactionId])
  if (existing.rowCount) return { ok: false as const, error: "This transaction was already reversed." }
  try {
    await db.transaction(async (tx) => {
      const [transaction] = await tx.select().from(bankTransaction).where(eq(bankTransaction.id, transactionId)).for("update")
      if (!transaction) throw new Error("TRANSACTION_NOT_FOUND")
      const [sender] = transaction.fromUserId === "bank" ? [] : await tx.select().from(bankAccount).where(eq(bankAccount.userId, transaction.fromUserId)).for("update")
      const [recipient] = transaction.toUserId === "bank" ? [] : await tx.select().from(bankAccount).where(eq(bankAccount.userId, transaction.toUserId)).for("update")
      if (transaction.fromUserId !== "bank" && !sender) throw new Error("ACCOUNT_NOT_FOUND")
      if (transaction.toUserId !== "bank" && !recipient) throw new Error("ACCOUNT_NOT_FOUND")
      if (sender && sender.balance < transaction.amount) throw new Error("INSUFFICIENT_FUNDS")
      if (sender) await tx.update(bankAccount).set({ balance: sql`${bankAccount.balance} - ${transaction.amount}` }).where(eq(bankAccount.userId, sender.userId))
      if (recipient) await tx.update(bankAccount).set({ balance: sql`${bankAccount.balance} + ${transaction.amount}` }).where(eq(bankAccount.userId, recipient.userId))
      await tx.insert(bankTransaction).values({ fromUserId: transaction.toUserId, toUserId: transaction.fromUserId, fromName: transaction.toName, toName: transaction.fromName, fromAccountNumber: transaction.toAccountNumber, toAccountNumber: transaction.fromAccountNumber, amount: transaction.amount, note: `Reversal of transaction #${transaction.id}: ${note.trim().slice(0, 160)}` })
    })
  } catch (error) {
    if (error instanceof Error && error.message === "TRANSACTION_NOT_FOUND") return { ok: false as const, error: "Transaction not found." }
    if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") return { ok: false as const, error: "The originating account cannot cover this reversal." }
    return { ok: false as const, error: "Transaction reversal could not be completed." }
  }
  await pool.query(`INSERT INTO admin_transaction_action (transaction_id, action, note, created_by) VALUES ($1, 'reversed', $2, $3)`, [transactionId, note.trim().slice(0, 500), admin.email])
  await logAdminAction(admin.id, "transaction_reversed", null, { transactionId, note: note.trim().slice(0, 160) })
  revalidatePath("/admin")
  return { ok: true as const }
}

export async function getAdminAuditLog(userId?: string) {
  await requireAdmin()
  await ensureAdminControlsTable()
  const result = await pool.query<AdminAuditEntry>(
    `SELECT aal.id::text, aal.action, admin.email AS "adminEmail", target.name AS "targetName", aal.details, aal.created_at AS "createdAt"
     FROM admin_action_log aal
     JOIN "user" admin ON admin.id = aal.admin_user_id
     LEFT JOIN "user" target ON target.id = aal.target_user_id
     WHERE ($1::text IS NULL OR aal.target_user_id = $1)
     ORDER BY aal.created_at DESC LIMIT 100`,
    [userId ?? null],
  )
  return result.rows
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
  const senderControl = await pool.query<{ status: string; fraud_freeze: boolean }>(
    `SELECT status, fraud_freeze FROM admin_user_control WHERE user_id = $1`,
    [sessionUser.id],
  )
  if (senderControl.rows[0]?.status === "restricted" || senderControl.rows[0]?.fraud_freeze) {
    return { ok: false as const, error: "Transfers are temporarily restricted on this account. Contact support." }
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
