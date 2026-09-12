import { pgTable, text, timestamp, boolean, serial, bigint } from "drizzle-orm/pg-core"

// ---- Better Auth tables (column names are Better Auth defaults — do not rename) ----

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// ---- Application tables ----

// Balances are stored in cents (bigint) to avoid floating-point drift.
export const bankAccount = pgTable("bank_account", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().unique(),
  accountNumber: text("accountNumber").notNull().unique(),
  routingNumber: text("routingNumber").notNull().default("021000021"),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const bankTransaction = pgTable("bank_transaction", {
  id: serial("id").primaryKey(),
  fromUserId: text("fromUserId").notNull(),
  toUserId: text("toUserId").notNull(),
  fromName: text("fromName").notNull(),
  toName: text("toName").notNull(),
  fromAccountNumber: text("fromAccountNumber").notNull(),
  toAccountNumber: text("toAccountNumber").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
